package com.game.tictactoe.model;

public class GameState {
    public char[] board = new char[9];
    public char turn = 'X';
    public boolean gameOver = false;
    public String message = "";
    public int timer = 15;
    public int scoreX = 0;
    public int scoreO = 0;
    public int round = 1;
    public int totalRounds = 1;

    public GameState() {
        resetBoard();
    }

    public void resetBoard() {
        for (int i = 0; i < 9; i++) board[i] = ' ';
        turn = 'X';
        gameOver = false;
        timer = 15;
        message = "Game started. X turn";
    }
}
