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

type CalendarTemplate = Omit<CalendarTask, "startDate" | "endDate" | "completed">;

export const cottonCalendarTemplates: CalendarTemplate[] = [
  { id: "land-preparation", title: "Land preparation", stage: "Pre-sowing", description: "Prepare the field based on local soil and field conditions.", dasStart: -21, dasEnd: -14 },
  { id: "soil-testing", title: "Soil testing", stage: "Pre-sowing", description: "Collect a representative soil sample and follow the laboratory's sampling guidance.", dasStart: -30, dasEnd: -15 },
  { id: "seed-selection", title: "Seed selection and treatment", stage: "Pre-sowing", description: "Select locally recommended seed and follow current label and extension guidance.", dasStart: -14, dasEnd: -1 },
  { id: "sowing", title: "Sowing", stage: "Sowing", description: "Record the actual or planned sowing date.", dasStart: 0, dasEnd: 0 },
  { id: "seedling-check", title: "Germination and seedling check", stage: "Establishment", description: "Inspect emergence and record gaps, stand condition and any symptoms.", dasStart: 5, dasEnd: 10 },
  { id: "gap-filling-thinning", title: "Gap filling and thinning check", stage: "Establishment", description: "Assess plant stand and consult local guidance before corrective action.", dasStart: 10, dasEnd: 21 },
  { id: "weed-management", title: "Weed-management check", stage: "Early growth", description: "Scout weeds and choose locally appropriate control methods.", dasStart: 15, dasEnd: 45 },
  { id: "fertilizer-check-1", title: "Nutrient-plan review", stage: "Early growth", description: "Review soil-test results and locally recommended nutrient timing; no dose is implied.", dasStart: 20, dasEnd: 30 },
  { id: "irrigation-check", title: "Irrigation and soil-moisture checks", stage: "Throughout crop", description: "Check soil moisture and crop conditions; do not irrigate from calendar date alone.", dasStart: 7, dasEnd: 180 },
  { id: "vegetative-growth", title: "Vegetative growth scouting", stage: "Vegetative", description: "Record crop growth, stand uniformity and signs of stress.", dasStart: 20, dasEnd: 50 },
  { id: "squaring", title: "Squaring-stage scouting", stage: "Squaring", description: "Inspect squares and scout for pests and symptoms; confirm findings with an expert.", dasStart: 45, dasEnd: 65 },
  { id: "flowering", title: "Flowering-stage scouting", stage: "Flowering", description: "Monitor flowering, fruiting parts and crop health.", dasStart: 60, dasEnd: 95 },
  { id: "boll-formation", title: "Boll formation and development checks", stage: "Boll development", description: "Inspect bolls and record damage, shedding or abnormal development.", dasStart: 90, dasEnd: 150 },
  { id: "pest-disease-monitoring", title: "Pest and disease monitoring", stage: "Throughout crop", description: "Scout regularly; weather or symptoms alone do not confirm a pest or disease.", dasStart: 20, dasEnd: 180 },
  { id: "first-picking", title: "Estimated first picking window", stage: "Harvest", description: "Planning estimate only; actual picking depends on cultivar, crop and local conditions.", dasStart: 150, dasEnd: 170 },
  { id: "subsequent-picking", title: "Estimated subsequent picking window", stage: "Harvest", description: "Planning estimate only; inspect boll opening and follow local harvest advice.", dasStart: 165, dasEnd: 190 },
  { id: "post-harvest", title: "Post-harvest field management", stage: "Post-harvest", description: "Manage crop residue and field sanitation following local extension guidance.", dasStart: 190, dasEnd: 210 },
];

export const isValidCalendarDate = (date: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
};

const dateAtDas = (sowingDate: string, das: number) => {
  const date = new Date(`${sowingDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + das);
  return date.toISOString().slice(0, 10);
};

export const buildCottonCalendar = (
  sowingDate: string,
  savedTasks: CalendarTask[] = [],
): CalendarTask[] => {
  if (!isValidCalendarDate(sowingDate)) {
    throw new Error("Enter a valid sowing date to generate the calendar.");
  }
  const savedById = new Map(savedTasks.map((task) => [task.id, task]));
  return cottonCalendarTemplates.map((template) => {
    const saved = savedById.get(template.id);
    const dasStart = saved?.dasStart ?? template.dasStart;
    const dasEnd = saved?.dasEnd ?? template.dasEnd;
    if (!Number.isInteger(dasStart) || !Number.isInteger(dasEnd) || dasStart > dasEnd) {
      throw new Error(`Invalid DAS range for ${template.title}.`);
    }
    return {
      ...template,
      dasStart,
      dasEnd,
      startDate: dateAtDas(sowingDate, dasStart),
      endDate: dateAtDas(sowingDate, dasEnd),
      completed: saved?.completed ?? false,
    };
  });
};
