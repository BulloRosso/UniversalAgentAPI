// student.service.ts
import { Client } from '@replit/object-storage';
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Student, VisitedLecture, AnsweredQuestion } from './student.interface';
import { ConflictException } from '@nestjs/common';

@Injectable()
export class StudentService {
  private readonly storageClient: Client;
  private readonly logger = new Logger(StudentService.name);

  constructor() {
    this.storageClient = new Client();
    this.logger.debug('StudentService initialized');
  }

  async getStudent(studentId: string): Promise<Student> {
    try {
      const key = `student-${studentId}.json`;
      const { ok, value, error } = await this.storageClient.downloadAsText(key);

      if (!ok || error) {
        this.logger.error(`Failed to find student: ${error}`);
        throw new NotFoundException(`Student with ID ${studentId} not found`);
      }

      try {
        const student = JSON.parse(value) as Student;
        this.logger.debug('Successfully retrieved student from storage');
        return student;
      } catch (parseError) {
        this.logger.error(`Error parsing student JSON: ${parseError.message}`);
        throw new Error('Invalid student data format');
      }
    } catch (error) {
      this.logger.error(`Error getting student: ${error.message}`);
      throw error;
    }
  }

  async addAnsweredQuestions(studentId: string, newQuestions: AnsweredQuestion[]): Promise<Student> {
    try {
      const student = await this.getStudent(studentId);
      student.answeredQuestions = [...student.answeredQuestions, ...newQuestions];

      await this.saveStudent(studentId, student);
      this.logger.debug(`Successfully added ${newQuestions.length} answered questions`);

      return student;
    } catch (error) {
      this.logger.error(`Error adding answered questions: ${error.message}`);
      throw error;
    }
  }

  async addLecture(studentId: string, newLecture: VisitedLecture): Promise<Student> {
    try {
      const student = await this.getStudent(studentId);
      student.visitedLectures = [...student.visitedLectures, newLecture];

      await this.saveStudent(studentId, student);
      this.logger.debug(`Successfully added lecture ${newLecture.lectureId}`);

      return student;
    } catch (error) {
      this.logger.error(`Error adding lecture: ${error.message}`);
      throw error;
    }
  }

  async updateLecture(studentId: string, updatedLecture: VisitedLecture): Promise<Student> {
    try {
      const student = await this.getStudent(studentId);
      const lectureIndex = student.visitedLectures.findIndex(
        lecture => lecture.lectureId === updatedLecture.lectureId
      );

      if (lectureIndex === -1) {
        throw new NotFoundException(`Lecture ${updatedLecture.lectureId} not found for student ${studentId}`);
      }

      student.visitedLectures[lectureIndex] = updatedLecture;
      await this.saveStudent(studentId, student);
      this.logger.debug(`Successfully updated lecture ${updatedLecture.lectureId}`);

      return student;
    } catch (error) {
      this.logger.error(`Error updating lecture: ${error.message}`);
      throw error;
    }
  }

  async updateStudent(studentId: string, updatedStudent: Student): Promise<Student> {
    try {
      // Verify student exists first
      await this.getStudent(studentId);

      // Update the student data
      await this.saveStudent(studentId, updatedStudent);
      this.logger.debug(`Successfully updated student ${studentId}`);

      return updatedStudent;
    } catch (error) {
      this.logger.error(`Error updating student: ${error.message}`);
      throw error;
    }
  }

  private async saveStudent(studentId: string, student: Student): Promise<void> {
    const key = `student-${studentId}.json`;
    const { ok, error } = await this.storageClient.uploadFromText(
      key,
      JSON.stringify(student)
    );

    if (!ok || error) {
      this.logger.error(`Failed to save student: ${error}`);
      throw new Error(`Failed to save student data: ${error}`);
    }
  }

  async createStudent(studentId: string): Promise<Student> {
    try {
      // Check if student already exists
      try {
        await this.getStudent(studentId);
        throw new ConflictException(`Student with ID ${studentId} already exists`);
      } catch (error) {
        // Only proceed if the error is NotFoundException
        if (!(error instanceof NotFoundException)) {
          throw error;
        }
      }

      // Create new student object
      const newStudent: Student = {
        studentId,
        visitedLectures: [],
        answeredQuestions: []
      };

      // Save the new student
      await this.saveStudent(studentId, newStudent);
      this.logger.debug(`Successfully created new student ${studentId}`);

      return newStudent;
    } catch (error) {
      this.logger.error(`Error creating student: ${error.message}`);
      throw error;
    }
  }
}