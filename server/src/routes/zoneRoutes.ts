import { Router } from "express";
import {
  createZone,
  createZonesBatch,
  deleteZone,
  getFieldZones,
  listZones,
  updateZone,
} from "../controllers/zoneController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/", listZones);
router.get("/field/:fieldId", getFieldZones);
router.post("/batch", createZonesBatch);
router.post("/", createZone);
router.patch("/:id", updateZone);
router.delete("/:id", deleteZone);

export default router;
