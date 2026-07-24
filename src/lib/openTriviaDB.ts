export interface TriviaQuestion {
  category: string;
  type: 'multiple' | 'boolean';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

export interface TriviaResponse {
  response_code: number;
  results: TriviaQuestion[];
}

export const fetchTriviaQuestions = async (
  amount: number = 15,
  category?: number,
  difficulty?: 'easy' | 'medium' | 'hard',
  type?: 'multiple' | 'boolean'
): Promise<TriviaQuestion[]> => {
  let url = `https://opentdb.com/api.php?amount=${amount}`;
  if (category) url += `&category=${category}`;
  if (difficulty) url += `&difficulty=${difficulty}`;
  if (type) url += `&type=${type}`;

  try {
    const response = await fetch(url);
    const data: TriviaResponse = await response.json();
    
    if (data.response_code !== 0) {
      console.error('Open Trivia DB Error:', data.response_code);
      return [];
    }

    return data.results;
  } catch (error) {
    console.error('Failed to fetch trivia questions:', error);
    return [];
  }
};

// Helper to decode HTML entities (opentdb uses them)
export const decodeHTMLEntities = (text: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

// Helper to shuffle answers
export const shuffleAnswers = (correct: string, incorrect: string[]): {
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
} => {
  const options = [correct, ...incorrect].sort(() => Math.random() - 0.5);
  const correctIndex = options.indexOf(correct);
  
  const letters = ['A', 'B', 'C', 'D'];
  
  return {
    option_a: options[0],
    option_b: options[1],
    option_c: options[2],
    option_d: options[3],
    correct_answer: letters[correctIndex],
  };
};
