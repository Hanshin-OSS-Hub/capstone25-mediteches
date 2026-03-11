import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { searchHospitals, searchPharmacies, getMedicineInfo, searchMedicines } from '../services/publicdata';

const router = Router();

const locationSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  department: z.string().optional(),
});

const medicineSchema = z.object({
  name: z.string().min(1, '의약품 이름(name) 쿼리 파라미터는 필수입니다.'),
});

router.get('/search', async (req: Request, res: Response): Promise<void> => {
  const parsed = locationSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'lat, lng 쿼리 파라미터가 올바르지 않습니다.', details: parsed.error.flatten() });
    return;
  }

  try {
    const { lat, lng, department } = parsed.data;
    const hospitals = await searchHospitals(lat, lng, department);

    const mapped = hospitals.map((h) => ({
      id: h.id,
      name: h.name,
      department: h.department,
      address: h.address,
      phone: h.phone,
      operatingHours: '',
      lat: h.lat,
      lng: h.lng,
      distance: h.distance,
      type: h.type,
      doctorCount: h.doctorCount,
    }));

    res.json(mapped);
  } catch (err) {
    console.error('Search hospitals error:', err);
    res.status(500).json({ error: '병원 검색 중 오류가 발생했습니다.' });
  }
});

router.get('/pharmacies', async (req: Request, res: Response): Promise<void> => {
  const parsed = locationSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'lat, lng 쿼리 파라미터가 올바르지 않습니다.', details: parsed.error.flatten() });
    return;
  }

  try {
    const { lat, lng } = parsed.data;
    const pharmacies = await searchPharmacies(lat, lng);

    const mapped = pharmacies.map((p) => ({
      id: p.id,
      name: p.name,
      address: p.address,
      phone: p.phone,
      operatingHours: '',
      lat: p.lat,
      lng: p.lng,
      distance: p.distance,
    }));

    res.json(mapped);
  } catch (err) {
    console.error('Search pharmacies error:', err);
    res.status(500).json({ error: '약국 검색 중 오류가 발생했습니다.' });
  }
});

function formatMedicineResponse(m: { name: string; company: string; category: string; ingredients: string; storage: string; type: string; eeDocUrl: string; udDocUrl: string; nbDocUrl: string }) {
  return {
    name: m.name,
    company: m.company,
    category: m.category,
    ingredients: m.ingredients,
    storage: m.storage,
    type: m.type,
    eeDocUrl: m.eeDocUrl,
    udDocUrl: m.udDocUrl,
    nbDocUrl: m.nbDocUrl,
  };
}

router.get('/medicine', async (req: Request, res: Response): Promise<void> => {
  const parsed = medicineSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: '의약품 이름(name)이 필요합니다.', details: parsed.error.flatten() });
    return;
  }

  try {
    const medicine = await getMedicineInfo(parsed.data.name);

    if (!medicine) {
      res.status(404).json({ error: '해당 의약품 정보를 찾을 수 없습니다.' });
      return;
    }

    res.json(formatMedicineResponse(medicine));
  } catch (err) {
    console.error('Get medicine info error:', err);
    res.status(500).json({ error: '의약품 정보 조회 중 오류가 발생했습니다.' });
  }
});

router.get('/medicine/search', async (req: Request, res: Response): Promise<void> => {
  const parsed = medicineSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: '의약품 이름(name)이 필요합니다.', details: parsed.error.flatten() });
    return;
  }

  try {
    const medicines = await searchMedicines(parsed.data.name);
    res.json(medicines.map(formatMedicineResponse));
  } catch (err) {
    console.error('Search medicines error:', err);
    res.status(500).json({ error: '의약품 검색 중 오류가 발생했습니다.' });
  }
});

export default router;
