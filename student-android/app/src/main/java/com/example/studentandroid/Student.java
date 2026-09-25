package com.example.studentandroid;

import com.google.gson.annotations.SerializedName;

/**
 * POJO matching the Student JSON shape returned by the REST API.
 * Fields match exactly: _id (MongoDB ObjectId), name, email, course, semester.
 */
public class Student {

    @SerializedName("_id")
    private String id;

    @SerializedName("name")
    private String name;

    @SerializedName("email")
    private String email;

    @SerializedName("course")
    private String course;

    @SerializedName("semester")
    private int semester;

    // No-arg constructor required by Gson
    public Student() {}

    public Student(String name, String email, String course, int semester) {
        this.name = name;
        this.email = email;
        this.course = course;
        this.semester = semester;
    }

    public String getId()       { return id; }
    public String getName()     { return name; }
    public String getEmail()    { return email; }
    public String getCourse()   { return course; }
    public int    getSemester() { return semester; }

    public void setName(String name)       { this.name = name; }
    public void setEmail(String email)     { this.email = email; }
    public void setCourse(String course)   { this.course = course; }
    public void setSemester(int semester)  { this.semester = semester; }
}
