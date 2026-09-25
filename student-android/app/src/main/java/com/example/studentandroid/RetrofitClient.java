package com.example.studentandroid;

import okhttp3.OkHttpClient;
import okhttp3.logging.HttpLoggingInterceptor;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

/**
 * Singleton Retrofit client built from Constants.API_BASE_URL.
 * Includes an OkHttp logging interceptor so you can see raw HTTP traffic in Logcat.
 */
public class RetrofitClient {

    private static Retrofit instance;

    public static Retrofit getInstance() {
        if (instance == null) {
            // Log request/response bodies to Logcat for debugging
            HttpLoggingInterceptor logging = new HttpLoggingInterceptor();
            logging.setLevel(HttpLoggingInterceptor.Level.BODY);

            OkHttpClient client = new OkHttpClient.Builder()
                    .addInterceptor(logging)
                    .build();

            instance = new Retrofit.Builder()
                    .baseUrl(Constants.API_BASE_URL)
                    .addConverterFactory(GsonConverterFactory.create())
                    .client(client)
                    .build();
        }
        return instance;
    }

    /** Convenience method to get the typed API service directly. */
    public static StudentApiService getApiService() {
        return getInstance().create(StudentApiService.class);
    }
}
