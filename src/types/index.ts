export interface Presentation {
  stepNumber: number;
  title: string;
  duration: number;
  narrative: string;
  type: 'video' | 'webpage';
  url: string;
}

export interface Discussion {
  prompt: string;
}

export interface Lesson {
  lessonId: string;
  sequenceNumber: number;
  title: string;
  presentation: Presentation;
  discussion: Discussion;
}

export interface Lecture {
  title: string;
  id: string;
  language: string;
  lessons: Lesson[];
}

export interface ChatMessage {
  timestamp: string;
  role: 'user' | 'tutor';
  message: string;
}

export interface Session {
  sessionId: string;
  teacherId: string;
  lectureId: string;
  lessonId: string;
  lastPresentationStepNumber: number;
  chat: ChatMessage[];
}