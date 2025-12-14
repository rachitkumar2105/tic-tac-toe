package com.game.tictactoe.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class MinimaxAI {

    private static final char AI = 'O';
    private static final char HUMAN = 'X';

    public int hardMove(char[] board) {
        List<Integer> empties = empty(board);
        if (empties.isEmpty()) return -1;
        int bestScore = Integer.MIN_VALUE;
        int move = -1;

        for (int i : empties) {
            board[i] = AI;
            int score = minimax(board, false);
            board[i] = ' ';
            if (score > bestScore) {
                bestScore = score;
                move = i;
            }
        }
        return move;
    }

    public int easyMove(char[] board) {
        List<Integer> e = empty(board);
        if (e.isEmpty()) return -1;
        return e.get(new Random().nextInt(e.size()));
    }

    public int mediumMove(char[] board) {
        List<Integer> empties = empty(board);
        if (empties.isEmpty()) return -1;

        for (int i : empties) {
            board[i] = AI;
            if (win(board, AI)) { board[i] = ' '; return i; }
            board[i] = ' ';
        }
        for (int i : empties) {
            board[i] = HUMAN;
            if (win(board, HUMAN)) { board[i] = ' '; return i; }
            board[i] = ' ';
        }
        return easyMove(board);
    }

    private int minimax(char[] b, boolean max) {
        if (win(b, AI)) return 10;
        if (win(b, HUMAN)) return -10;
        if (empty(b).isEmpty()) return 0;

        int best = max ? Integer.MIN_VALUE : Integer.MAX_VALUE;

        for (int i : empty(b)) {
            b[i] = max ? AI : HUMAN;
            int score = minimax(b, !max);
            b[i] = ' ';
            best = max ? Math.max(best, score) : Math.min(best, score);
        }
        return best;
    }

    private boolean win(char[] b, char p) {
        int[][] w = {{0,1,2},{3,4,5},{6,7,8},{0,3,6},{1,4,7},{2,5,8},{0,4,8},{2,4,6}};
        for (int[] c : w)
            if (b[c[0]]==p && b[c[1]]==p && b[c[2]]==p) return true;
        return false;
    }

    private List<Integer> empty(char[] b) {
        List<Integer> e = new ArrayList<>();
        for (int i=0;i<9;i++) if (b[i]==' ') e.add(i);
        return e;
    }
}
