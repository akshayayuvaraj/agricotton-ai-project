export type CalendarTask = {
  id: string;
  title: string;
  stage: string;
  description: string;
  dasStart: number;
  dasEnd: number;
  startDate: string;
  endDate: string;
  completed: boolean;
};

export type CalendarPlan = {
  id: string;
  userId: string;
  fieldId: string;
  sowingDate: string;
  tasks: CalendarTask[];
  createdAt: string;
  updatedAt: string;
};
