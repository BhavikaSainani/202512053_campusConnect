package com.example.studentandroid;

/**
 * Single source of truth for the API base URL.
 * On the Android Emulator, 10.0.2.2 is the special alias that points to
 * the host machine (where the Express.js API runs on localhost:3001).
 * For a physical device, replace with your machine's LAN IP address.
 */
public class Constants {
    public static final String API_BASE_URL = "http://10.0.2.2:3001/";
}
