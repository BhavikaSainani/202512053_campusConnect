package com.example.studentandroid;

import java.util.List;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.POST;

/**
 * Retrofit interface defining the Student API endpoints used by the Android app.
 * Only GET /students and POST /students are needed for the Lab 4 partial client.
 */
public interface StudentApiService {

    /** GET /students — list all students */
    @GET("students")
    Call<List<Student>> getStudents();

    /** POST /students — create a new student; returns the created Student (201) */
    @POST("students")
    Call<Student> createStudent(@Body Student student);
}
