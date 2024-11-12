import { Controller, Get, Put, Post, Body, Param, HttpStatus } from '@nestjs/common';
import { StudentService } from './student.service';
import { Student, VisitedLecture, AnsweredQuestion } from './student.interface';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('students')
@Controller('api/students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Put(':studentId')
  @ApiOperation({ summary: 'Create a new student with empty arrays' })
  @ApiParam({ name: 'studentId', description: 'The ID of the student to create' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Student created successfully' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Student already exists' })
  async createStudent(@Param('studentId') studentId: string): Promise<Student> {
    return this.studentService.createStudent(studentId);
  }
  
  @Get(':studentId')
  @ApiOperation({ summary: 'Get student data by ID' })
  @ApiParam({ name: 'studentId', description: 'The ID of the student' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Student data retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Student not found' })
  async getStudent(@Param('studentId') studentId: string): Promise<Student> {
    return this.studentService.getStudent(studentId);
  }

  @Post(':studentId/addAnsweredQuestions')
  @ApiOperation({ summary: 'Add answered questions to student record' })
  @ApiParam({ name: 'studentId', description: 'The ID of the student' })
  @ApiBody({ type: [Object], description: 'Array of answered questions' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Questions added successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Student not found' })
  async addAnsweredQuestions(
    @Param('studentId') studentId: string,
    @Body() answeredQuestions: AnsweredQuestion[]
  ): Promise<Student> {
    return this.studentService.addAnsweredQuestions(studentId, answeredQuestions);
  }

  @Post(':studentId/addLecture')
  @ApiOperation({ summary: 'Add a visited lecture to student record' })
  @ApiParam({ name: 'studentId', description: 'The ID of the student' })
  @ApiBody({ type: Object, description: 'Visited lecture object' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lecture added successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Student not found' })
  async addLecture(
    @Param('studentId') studentId: string,
    @Body() visitedLecture: VisitedLecture
  ): Promise<Student> {
    return this.studentService.addLecture(studentId, visitedLecture);
  }

  @Post(':studentId/updateLecture')
  @ApiOperation({ summary: 'Update a visited lecture in student record' })
  @ApiParam({ name: 'studentId', description: 'The ID of the student' })
  @ApiBody({ type: Object, description: 'Updated lecture object' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lecture updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Student or lecture not found' })
  async updateLecture(
    @Param('studentId') studentId: string,
    @Body() visitedLecture: VisitedLecture
  ): Promise<Student> {
    return this.studentService.updateLecture(studentId, visitedLecture);
  }

  @Post(':studentId')
  @ApiOperation({ summary: 'Update entire student record' })
  @ApiParam({ name: 'studentId', description: 'The ID of the student' })
  @ApiBody({ type: Object, description: 'Complete student object' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Student updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Student not found' })
  async updateStudent(
    @Param('studentId') studentId: string,
    @Body() student: Student
  ): Promise<Student> {
    return this.studentService.updateStudent(studentId, student);
  }
}