import { Router, Request, Response } from 'express';
import Settings from '../models/Settings';

const router = Router();

// GET settings (returns single settings doc or creates default)
router.get('/', async (_req: Request, res: Response) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        supervisorName: 'امل طاهر',
      });
    }
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update settings
router.put('/', async (req: Request, res: Response) => {
  try {
    const { supervisorName, introText, outroText } = req.body;
    const updateObj: any = {};

    if (supervisorName !== undefined) updateObj.supervisorName = supervisorName;
    if (introText !== undefined) updateObj.introText = introText;
    if (outroText !== undefined) updateObj.outroText = outroText;

    let settings = await Settings.findOneAndUpdate({}, updateObj, {
      new: true,
      upsert: true,
      runValidators: true,
    });

    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
