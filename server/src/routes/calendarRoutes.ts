import { Router } from "express";
import { getCalendarPlan, saveCalendarPlan } from "../controllers/calendarController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);
router.get("/", getCalendarPlan);
router.put("/", saveCalendarPlan);

export default router;
