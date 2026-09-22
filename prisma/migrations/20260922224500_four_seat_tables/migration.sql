UPDATE "mesas_reservables"
SET "capacidad" = 4,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "codigo" IN ('T1','T2','T3','T4','T5','T6','T7','T8');
