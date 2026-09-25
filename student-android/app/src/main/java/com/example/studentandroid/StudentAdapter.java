package com.example.studentandroid;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.util.List;

/**
 * RecyclerView adapter that binds a List<Student> to item_student.xml rows.
 */
public class StudentAdapter extends RecyclerView.Adapter<StudentAdapter.StudentViewHolder> {

    private List<Student> students;

    public StudentAdapter(List<Student> students) {
        this.students = students;
    }

    public void updateData(List<Student> newStudents) {
        this.students = newStudents;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public StudentViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_student, parent, false);
        return new StudentViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull StudentViewHolder holder, int position) {
        Student student = students.get(position);
        holder.nameText.setText(student.getName());
        holder.emailText.setText(student.getEmail());
        holder.courseText.setText(student.getCourse());
        holder.semesterText.setText("Sem " + student.getSemester());
    }

    @Override
    public int getItemCount() {
        return students != null ? students.size() : 0;
    }

    static class StudentViewHolder extends RecyclerView.ViewHolder {
        TextView nameText, emailText, courseText, semesterText;

        StudentViewHolder(@NonNull View itemView) {
            super(itemView);
            nameText     = itemView.findViewById(R.id.tv_name);
            emailText    = itemView.findViewById(R.id.tv_email);
            courseText   = itemView.findViewById(R.id.tv_course);
            semesterText = itemView.findViewById(R.id.tv_semester);
        }
    }
}
