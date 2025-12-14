package com.game.tictactoe.controller;

import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import java.util.Random;
import java.util.concurrent.ThreadLocalRandom;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.game.tictactoe.service.MinimaxAI;

@RestController
@RequestMapping("/api")
@CrossOrigin
public class GameController {

    @GetMapping("/health")
    public String health() {
        return "Backend Running";
    }

    // Stateless AI move endpoint
    @PostMapping({"/ai-move", "/ai/move"})
    public int aiMoveOnBoard(@RequestParam(defaultValue = "hard") String level,
                             @RequestBody String[] board) {
        char[] b = new char[9];
        for (int i = 0; i < 9; i++) {
            String s = (board != null && board.length > i) ? board[i] : " ";
            b[i] = (s != null && !s.isEmpty()) ? s.charAt(0) : ' ';
        }
        MinimaxAI ai = new MinimaxAI();
        return switch (level) {
            case "easy" -> ai.easyMove(b);
            case "medium" -> ai.mediumMove(b);
            default -> ai.hardMove(b);
        };
    }

    @PostMapping("/probability")
    public Map<String,Integer> probability(@RequestBody String[] board) {
        char[] b = new char[9];
        for (int i = 0; i < 9; i++) {
            String s = (board != null && board.length > i) ? board[i] : " ";
            b[i] = (s != null && !s.isEmpty()) ? s.charAt(0) : ' ';
        }

        // Check if board is empty (game start)
        boolean isEmpty = true;
        for (char c : b) {
            if (c != ' ') { isEmpty = false; break; }
        }
        if (isEmpty) {
            Map<String,Integer> res = new HashMap<>();
            res.put("x", 50);
            res.put("o", 50);
            return res;
        }

        // Determine current player from counts: X starts; if counts equal -> X's turn else O's turn
        int countX = 0, countO = 0;
        for (char c : b) { if (c == 'X') countX++; else if (c == 'O') countO++; }
        char currentPlayer = (countX == countO) ? 'X' : 'O';

        // Monte Carlo rollouts with epsilon-greedy playouts (mix of near-optimal and random)
        int sims = 800;               // number of simulated playouts (adjust for speed)
        double epsilon = 0.18;        // chance to play random move in playout (controls "mistake" rate)

        int winsX = 0, winsO = 0, draws = 0;
        Random rnd = ThreadLocalRandom.current();

        for (int s = 0; s < sims; s++) {
            char[] copy = b.clone();
            char turn = currentPlayer;
            while (true) {
                // terminal check
                if (checkWin(copy, 'X')) { winsX++; break; }
                if (checkWin(copy, 'O')) { winsO++; break; }
                if (isBoardFull(copy)) { draws++; break; }

                List<Integer> empties = emptyIndices(copy);
                int move;
                if (rnd.nextDouble() < (1.0 - epsilon)) {
                    move = bestMoveHeuristic(copy, turn); // near-optimal heuristic
                    if (move == -1) move = empties.get(rnd.nextInt(empties.size()));
                } else {
                    move = empties.get(rnd.nextInt(empties.size()));
                }
                copy[move] = turn;
                turn = (turn == 'X') ? 'O' : 'X';
            }
        }

        // Convert to shared scores: split draws evenly so X% + O% == 100
        double scoreX = winsX + draws * 0.5;
        double scoreO = winsO + draws * 0.5;
        double total = scoreX + scoreO;
        int px = 50, po = 50;
        if (total > 0) {
            px = (int)Math.round((scoreX / total) * 100.0);
            po = 100 - px;
        }

        Map<String,Integer> res = new HashMap<>();
        res.put("x", px);
        res.put("o", po);
        return res;
    }

    // Returns list of empty indices
    private List<Integer> emptyIndices(char[] b) {
        List<Integer> empty = new ArrayList<>();
        for (int i = 0; i < 9; i++) if (b[i] == ' ') empty.add(i);
        return empty;
    }

    // Near-optimal heuristic used in playouts:
    // 1) immediate winning move
    // 2) block opponent's immediate winning move
    // 3) take center
    // 4) take any corner
    // 5) fallback to any empty
    private int bestMoveHeuristic(char[] b, char player) {
        char opponent = (player == 'X') ? 'O' : 'X';
        List<Integer> empties = emptyIndices(b);

        // immediate win
        for (int idx : empties) {
            b[idx] = player;
            if (checkWin(b, player)) { b[idx] = ' '; return idx; }
            b[idx] = ' ';
        }
        // block opponent
        for (int idx : empties) {
            b[idx] = opponent;
            if (checkWin(b, opponent)) { b[idx] = ' '; return idx; }
            b[idx] = ' ';
        }
        // center
        if (b[4] == ' ') return 4;
        // corners
        int[] corners = {0,2,6,8};
        for (int c : corners) if (b[c] == ' ') return c;
        // fallback
        if (!empties.isEmpty()) return empties.get(new Random().nextInt(empties.size()));
        return -1;
    }

    @PostMapping("/tournament/result")
    public Map<String,Object> tournamentResult(@RequestBody Map<String,Integer> payload) {
        // payload expects keys "score1" and "score2" and optional "p1" and "p2" names
        int s1 = payload.getOrDefault("score1", 0);
        int s2 = payload.getOrDefault("score2", 0);
        String p1name = payload.getOrDefault("p1", 0) instanceof Integer ? "Player 1" : (String)payload.getOrDefault("p1", "Player 1");
        String p2name = payload.getOrDefault("p2", 0) instanceof Integer ? "Player 2" : (String)payload.getOrDefault("p2", "Player 2");

        Map<String,Object> out = new HashMap<>();
        if (s1 > s2) {
            out.put("winner", p1name);
            out.put("message", "Winner: " + p1name);
        } else if (s2 > s1) {
            out.put("winner", p2name);
            out.put("message", "Winner: " + p2name);
        } else {
            out.put("winner", null);
            out.put("message", "Tournament Draw");
        }
        out.put("score1", s1);
        out.put("score2", s2);
        return out;
    }
}
