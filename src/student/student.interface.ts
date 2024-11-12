export interface VisitedLecture {
  lectureId: string;
  isActive: boolean;
  lastLessionId: string;
}

export interface AnsweredQuestion {
  lectureId: string;
  category: string;
  correctAnswer: boolean;
}

export interface Student {
  studentId: string;
  visitedLectures: VisitedLecture[];
  answeredQuestions: AnsweredQuestion[];
}