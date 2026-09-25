package com.example.studentandroid;

import android.os.Bundle;
import android.text.TextUtils;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import org.json.JSONObject;

import java.io.IOException;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Add Student screen — simple form that calls POST /students.
 * Shows Toast messages for:
 *   201 Created     → "Student added successfully!"
 *   400 Bad Request → shows the error message from the API body
 *   Network/5xx     → "Something went wrong. Please try again."
 */
public class AddStudentActivity extends AppCompatActivity {

    private EditText etName, etEmail, etCourse, etSemester;
    private Button btnSubmit;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_add_student);

        if (getSupportActionBar() != null) {
            getSupportActionBar().setTitle("Add Student");
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        }

        etName     = findViewById(R.id.et_name);
        etEmail    = findViewById(R.id.et_email);
        etCourse   = findViewById(R.id.et_course);
        etSemester = findViewById(R.id.et_semester);
        btnSubmit  = findViewById(R.id.btn_submit);

        btnSubmit.setOnClickListener(v -> handleSubmit());
    }

    @Override
    public boolean onSupportNavigateUp() {
        finish();
        return true;
    }

    private void handleSubmit() {
        // ── Client-side validation ───────────────────────────────────────────
        String name     = etName.getText().toString().trim();
        String email    = etEmail.getText().toString().trim();
        String course   = etCourse.getText().toString().trim();
        String semStr   = etSemester.getText().toString().trim();

        if (TextUtils.isEmpty(name)) {
            etName.setError("Name is required");
            etName.requestFocus();
            return;
        }
        if (TextUtils.isEmpty(email) || !android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            etEmail.setError("A valid email is required");
            etEmail.requestFocus();
            return;
        }
        if (TextUtils.isEmpty(course)) {
            etCourse.setError("Course is required");
            etCourse.requestFocus();
            return;
        }
        if (TextUtils.isEmpty(semStr)) {
            etSemester.setError("Semester is required");
            etSemester.requestFocus();
            return;
        }
        int semester;
        try {
            semester = Integer.parseInt(semStr);
            if (semester < 1) throw new NumberFormatException();
        } catch (NumberFormatException e) {
            etSemester.setError("Semester must be a positive number");
            etSemester.requestFocus();
            return;
        }

        // ── POST /students ───────────────────────────────────────────────────
        Student newStudent = new Student(name, email, course, semester);
        btnSubmit.setEnabled(false);
        btnSubmit.setText("Adding…");

        RetrofitClient.getApiService().createStudent(newStudent).enqueue(new Callback<Student>() {
            @Override
            public void onResponse(Call<Student> call, Response<Student> response) {
                btnSubmit.setEnabled(true);
                btnSubmit.setText("Add Student");

                if (response.code() == 201) {
                    // ✅ 201 Created
                    Toast.makeText(AddStudentActivity.this, "Student added successfully!", Toast.LENGTH_SHORT).show();
                    finish(); // go back to list (onResume will refresh it)

                } else if (response.code() == 400) {
                    // ⚠️  400 Bad Request — show the specific error from API
                    String apiError = "Validation failed. Please check your input.";
                    try {
                        if (response.errorBody() != null) {
                            JSONObject json = new JSONObject(response.errorBody().string());
                            if (json.has("error")) {
                                apiError = json.getString("error");
                            }
                        }
                    } catch (Exception ignored) {}
                    Toast.makeText(AddStudentActivity.this, apiError, Toast.LENGTH_LONG).show();

                } else if (response.code() == 404) {
                    Toast.makeText(AddStudentActivity.this, "Student not found", Toast.LENGTH_LONG).show();

                } else {
                    Toast.makeText(AddStudentActivity.this,
                            "Something went wrong (HTTP " + response.code() + ")", Toast.LENGTH_LONG).show();
                }
            }

            @Override
            public void onFailure(Call<Student> call, Throwable t) {
                btnSubmit.setEnabled(true);
                btnSubmit.setText("Add Student");
                Toast.makeText(AddStudentActivity.this,
                        "Something went wrong. Please try again.", Toast.LENGTH_LONG).show();
            }
        });
    }
}
