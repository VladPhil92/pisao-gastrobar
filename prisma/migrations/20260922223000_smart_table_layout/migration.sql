CREATE TABLE "mesas_reservables" (
  "id" TEXT NOT NULL,
  "codigo" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "capacidad" INTEGER NOT NULL DEFAULT 5,
  "zona" TEXT NOT NULL DEFAULT 'Terraza reservable',
  "prioridad" INTEGER NOT NULL DEFAULT 100,
  "combinable" BOOLEAN NOT NULL DEFAULT true,
  "activa" BOOLEAN NOT NULL DEFAULT true,
  "atributos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "posX" INTEGER NOT NULL DEFAULT 0,
  "posY" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mesas_reservables_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mesas_reservables_codigo_key"
ON "mesas_reservables"("codigo");

CREATE INDEX "mesas_reservables_activa_prioridad_idx"
ON "mesas_reservables"("activa", "prioridad");

INSERT INTO "mesas_reservables"
("id","codigo","nombre","capacidad","zona","prioridad","combinable","activa","atributos","posX","posY")
VALUES
('mesa_t1','T1','Mesa T1',5,'Terraza reservable',10,true,true,ARRAY['reservable'],0,0),
('mesa_t2','T2','Mesa T2',5,'Terraza reservable',20,true,true,ARRAY['reservable'],1,0),
('mesa_t3','T3','Mesa T3',5,'Terraza reservable',30,true,true,ARRAY['reservable'],2,0),
('mesa_t4','T4','Mesa T4',5,'Terraza reservable',40,true,true,ARRAY['reservable'],3,0),
('mesa_t5','T5','Mesa T5',5,'Terraza reservable',50,true,true,ARRAY['reservable'],0,1),
('mesa_t6','T6','Mesa T6',5,'Terraza reservable',60,true,true,ARRAY['reservable'],1,1),
('mesa_t7','T7','Mesa T7',5,'Terraza reservable',70,true,true,ARRAY['reservable'],2,1),
('mesa_t8','T8','Mesa T8',5,'Terraza reservable',80,true,true,ARRAY['reservable'],3,1);
