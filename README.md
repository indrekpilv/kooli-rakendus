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

Muuda faili `site/data/menu.json`. Veebilehe koodi ei ole vaja muuta. Pärast faili üleslaadimist GitHubi käivitub avaldamise töövoog automaatselt.

## GitHub Pagesi seadistamine

1. Loo GitHubis uus repositoorium.
2. Lae selle projekti failid repositooriumi põhitasemele.
3. Ava **Settings → Pages**.
4. Vali avaldamise allikaks **GitHub Actions**.
5. Tee muudatus harusse `main` või käivita töövoog käsitsi.

Töövoog avaldab ainult kausta `site`, seega jäävad projekti abifailid veebilehelt välja.
