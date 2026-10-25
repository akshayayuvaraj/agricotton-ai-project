import { Router } from "express";
import {
  getCottonIssue,
  listCottonIssues,
} from "../controllers/cottonIssueController.js";

const router = Router();

router.get("/", listCottonIssues);
router.get("/:id", getCottonIssue);

export default router;
