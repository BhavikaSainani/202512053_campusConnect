package com.example.student_spring_api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class StudentService {

    private final StudentRepository studentRepository;

    @Autowired
    public StudentService(StudentRepository studentRepository) {
        this.studentRepository = studentRepository;
    }

    public List<Student> getAllStudents() {
        return studentRepository.findAll();
    }

    public Optional<Student> getStudentById(Integer id) {
        return studentRepository.findById(id);
    }

    public Student createStudent(Student student) {
        return studentRepository.save(student);
    }

    public Student updateStudent(Integer id, Student student) {
        Optional<Student> existingStudent = studentRepository.findById(id);
        if (existingStudent.isPresent()) {
            student.setId(id);
            return studentRepository.save(student);
        }
        return null; // Return null if not found
    }

    public boolean deleteStudent(Integer id) {
        if (studentRepository.findById(id).isPresent()) {
            studentRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
