# Database Setup & Development Guide

##  Voor nieuwe teamleden

### Eerste keer opstarten
```bash
docker-compose up --build -d
```

Dit doet automatisch:
-  MySQL database aanmaken
-  Spring Boot applicatie builden
-  Database tabellen aanmaken (via Hibernate)
-  **Building types laden** (alleen als tabel leeg is)
-  Dummy data laden voor testing

### Database connectie (IntelliJ/DBeaver/etc.)
- **Host:** `localhost`
- **Port:** `3307`  (niet 3306!)
- **Database:** `mydb`
- **User:** `appuser`
- **Password:** `apppassword`

---

## Bij herbouwen/herstarten

### Normaal herstarten (data blijft behouden)
```bash
docker-compose restart
```
Of:
```bash
docker-compose down
docker-compose up -d
```

**Resultaat:** Alle data blijft behouden! 

### Volledig opnieuw beginnen (alles wissen)
```bash
docker-compose down -v  # -v verwijdert volumes (= database data)
docker-compose up --build -d
```

**Resultaat:** Database wordt opnieuw aangemaakt met initial building types

---

##  Building Types beheren

### Via REST API

**Alle types ophalen:**
```bash
curl http://localhost:8081/api/data/building-types
```

**Nieuw type toevoegen:**
```bash
curl -X POST http://localhost:8081/api/data/building-types \
  -H "Content-Type: application/json" \
  -d '{
    "typeId": "school",
    "colorHex": "#FFC107",
    "cost": 600,
    "income": 5,
    "people": 0.025,
    "livability": 8
  }'
```

**Type verwijderen:**
```bash
curl -X DELETE http://localhost:8081/api/data/building-types/{id}
```

### Via Database (IntelliJ)
Gewoon de tabel `building_types` bewerken via de Database tool window.

---

##  Hoe werkt de data initialisatie?

### Automatische initialisatie
De `DataLoader.java` class checkt bij elke start:

1. **Building Types tabel leeg?**
   - Ja → Laad 10 standaard types
   - Nee → Skip (bestaande data blijft behouden)

2. **Polygons/Models tabellen leeg?**
   - Ja → Laad dummy test data
   - Nee → Skip

### Belangrijk! 
- Data wordt **NOOIT** overschreven bij herstart
- Alleen als tabellen **compleet leeg** zijn, wordt initial data geladen
- Custom types die je toevoegt blijven **altijd** behouden

---

##  Troubleshooting

### "Kan geen connectie maken met database"
```bash
# Check of containers draaien
docker ps

# Check logs
docker logs my-java-app
docker logs my-sql-db

# Herstart containers
docker-compose restart
```

### "Building types worden niet geladen in client"
1. Check of API werkt: `http://localhost:8081/api/data/building-types`
2. Check browser console voor errors
3. Zorg dat Spring Boot container draait

### "Ik wil de database resetten"
```bash
docker-compose down -v
docker-compose up --build -d
```

---

##  Development Workflow

### Nieuwe building type toevoegen (production)
1. Voeg toe via API of database tool
2. Type is direct beschikbaar voor alle teamleden
3. Bij git pull + docker restart blijft type behouden

### Database schema wijzigen
1. Pas Entity class aan (bijv. `BuildingType.java`)
2. Rebuild: `docker-compose up --build -d`
3. Hibernate update schema automatisch (`ddl-auto=update`)

### Nieuwe initial types toevoegen voor hele team
1. Bewerk `DataLoader.java` → `loadBuildingTypesIfNeeded()`
2. Commit changes naar git
3. Teamleden: `docker-compose down -v && docker-compose up --build -d`

---

## 🎓 Best Practices

 **DO:**
- Gebruik API voor runtime changes
- Commit code changes (niet database data)
- Test met dummy data

 **DON'T:**
- Handmatig data.sql bewerken (wordt niet gebruikt)
- Database credentials in code zetten
- Aannemen dat data persistent is zonder volumes

---

##  Nuttige commando's

```bash
# Logs bekijken (live)
docker logs -f my-java-app

# Database console openen
docker exec -it my-sql-db mysql -uappuser -papppassword mydb

# SQL query uitvoeren
docker exec -it my-sql-db mysql -uappuser -papppassword mydb \
  -e "SELECT * FROM building_types;"

# Container shell openen
docker exec -it my-java-app /bin/bash

# Alles stoppen en opruimen
docker-compose down -v
docker system prune -a
```
