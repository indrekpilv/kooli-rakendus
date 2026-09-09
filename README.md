# Rakvere Eragümnaasiumi kiirlinkide rakendus

Esimene lihtne versioon kooli veebirakendusest. Praegu sisaldab see avalehte ja nädalamenüüd. Tunniplaani moodul lisatakse hiljem eraldi.

## Kohalik vaatamine

Kuna menüü laaditakse JSON-failist, ava projekt väikese kohaliku veebiserveri kaudu:

```bash
cd rakvere-eragumnaasium/site
python3 -m http.server 8000
```

Seejärel ava brauseris `http://localhost:8000`.

## Menüü muutmine

Muuda faili `site/data/menu.md`. Kasuta sama Markdowni vormi nagu kooli kodulehel:

```markdown
Toitlustamise nädal 07.09 – 11.09

### Esmaspäev

#### Hommikusöök

- Kaerahelbepuder, keedis
- Võileib singiga

#### Lõunasöök

- Kanakotlet, kartul ja salat
```

GitHub Actions teisendab faili automaatselt failiks `site/data/menu.json` ja avaldab selle. JSON-i ei ole vaja käsitsi muuta.

Markdowni märgid ei ole kohustuslikud. Kui kopeerid menüü kodulehelt tavalise tekstina, tunneb parser ära ka sellise vormi:

```text
Esmaspäev

Hommikusöök

Kaerahelbepuder, keedis
Võileib singiga

Lõunasöök

Kanakotlet, kartul ja salat
```

Oluline on, et päevad, toidukorrad ja menüüread jääksid eraldi ridadele.

## GitHub Pagesi seadistamine

1. Loo GitHubis uus repositoorium.
2. Lae selle projekti failid repositooriumi põhitasemele.
3. Ava **Settings → Pages**.
4. Vali avaldamise allikaks **GitHub Actions**.
5. Tee muudatus harusse `main` või käivita töövoog käsitsi.

Töövoog avaldab ainult kausta `site`, seega jäävad projekti abifailid veebilehelt välja.
