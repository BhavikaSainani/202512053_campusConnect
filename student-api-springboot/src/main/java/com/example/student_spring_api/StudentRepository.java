package com.example.student_spring_api;

import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

@Repository
public class StudentRepository {
    private final List<Student> students = new ArrayList<>();
    private final AtomicInteger idGenerator = new AtomicInteger(1);

    public StudentRepository() {
        students.add(new Student(idGenerator.getAndIncrement(), "John Doe", "john@example.com", "Computer Science", 3));
        students.add(new Student(idGenerator.getAndIncrement(), "Jane Smith", "jane@example.com", "Software Engineering", 4));
    }

    public List<Student> findAll() {
        return new ArrayList<>(students);
    }

    public Optional<Student> findById(Integer id) {
        return students.stream().filter(s -> s.getId().equals(id)).findFirst();
    }

    public Student save(Student student) {
        if (student.getId() == null) {
            student.setId(idGenerator.getAndIncrement());
            students.add(student);
        } else {
            Optional<Student> existing = findById(student.getId());
            if (existing.isPresent()) {
                students.remove(existing.get());
                students.add(student);
            } else {
                students.add(student);
            }
        }
        return student;
    }

    public void deleteById(Integer id) {
        students.removeIf(s -> s.getId().equals(id));
    }
}
