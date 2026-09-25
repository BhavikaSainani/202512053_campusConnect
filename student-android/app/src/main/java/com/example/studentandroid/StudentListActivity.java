package com.example.studentandroid;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.floatingactionbutton.FloatingActionButton;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Main screen — calls GET /students and displays results in a RecyclerView.
 * A FAB navigates to AddStudentActivity. The list refreshes on every resume.
 */
public class StudentListActivity extends AppCompatActivity {

    private RecyclerView recyclerView;
    private StudentAdapter adapter;
    private ProgressBar progressBar;
    private TextView emptyText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_student_list);

        // Bind views
        recyclerView = findViewById(R.id.rv_students);
        progressBar  = findViewById(R.id.progress_bar);
        emptyText    = findViewById(R.id.tv_empty);

        // Set up RecyclerView
        recyclerView.setLayoutManager(new LinearLayoutManager(this));
        adapter = new StudentAdapter(new ArrayList<>());
        recyclerView.setAdapter(adapter);

        // FAB → Add Student
        FloatingActionButton fab = findViewById(R.id.fab_add);
        fab.setOnClickListener(v -> {
            Intent intent = new Intent(StudentListActivity.this, AddStudentActivity.class);
            startActivity(intent);
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Refresh list every time screen is resumed (e.g. after adding a student)
        fetchStudents();
    }

    private void fetchStudents() {
        progressBar.setVisibility(View.VISIBLE);
        recyclerView.setVisibility(View.GONE);
        emptyText.setVisibility(View.GONE);

        RetrofitClient.getApiService().getStudents().enqueue(new Callback<List<Student>>() {
            @Override
            public void onResponse(Call<List<Student>> call, Response<List<Student>> response) {
                progressBar.setVisibility(View.GONE);

                if (response.isSuccessful() && response.body() != null) {
                    List<Student> students = response.body();
                    if (students.isEmpty()) {
                        emptyText.setVisibility(View.VISIBLE);
                        emptyText.setText("No students found. Tap + to add one!");
                    } else {
                        recyclerView.setVisibility(View.VISIBLE);
                        adapter.updateData(students);
                    }
                } else if (response.code() == 404) {
                    // 404 — no students resource found
                    showToast("Student not found");
                } else {
                    showToast("Something went wrong (HTTP " + response.code() + ")");
                }
            }

            @Override
            public void onFailure(Call<List<Student>> call, Throwable t) {
                progressBar.setVisibility(View.GONE);
                emptyText.setVisibility(View.VISIBLE);
                emptyText.setText("Unable to load data. Check your connection.");
                showToast("Something went wrong: " + t.getMessage());
            }
        });
    }

    private void showToast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }
}
