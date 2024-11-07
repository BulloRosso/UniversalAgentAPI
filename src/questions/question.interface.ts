// question.interface.ts
export interface Choice {
  id: number;
  text: string;
}

export interface Question {
  id: string;
  question: string;
  type: 'single-choice' | 'multiple-choice' | 'drag-and-drop';
  choices: Choice[];
  answerId: number[];
  points: number;
  placeholders?: string[];
}

export interface QuestionsResponse {
  questions: Question[];
}