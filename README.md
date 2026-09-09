# Rakvere Eragümnaasiumi kiirlinkide rakendus

Kooli lihtne veebirakendus, mis sisaldab avalehte, nädalamenüüd ja tunniplaani.

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

Kui uus nädalamenüü saabub neljapäeval või reedel, ära kustuta vana nädala plokki. Kleebi uus plokk olemasoleva alla, näiteks:

```text
Toitlustamise nädal 07.09 – 11.09
... vana nädala menüü ...

Toitlustamise nädal 14.09 – 18.09
... järgmise nädala menüü ...
```

Rakendus valib kuupäeva järgi õige nädala. Nädalavahetusel näitab ta järgmise nädala esmaspäeva ja teisipäeva, kui järgmise nädala plokk on juba lisatud.

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

## Tunniplaani muutmine

Untise XML-fail asub failis `data/tunniplaan.xml`. Kui Untisest tuleb uus XML:

1. asenda fail `data/tunniplaan.xml` uue XML-failiga;
2. tee GitHubis muudatus harusse `main`;
3. GitHub Actions koostab automaatselt faili `site/data/tunniplaan.json` ja avaldab uue tunniplaani.

`deploy.yml` faili ei ole tavapärase XML-i vahetamise korral vaja muuta.

Tunniplaani lehel saab otsida klasse, õpetajaid ja ruume. Vaikimisi kuvatakse valitud objekti tänane koolipäev vertikaalse loendina; päeva saab vahetada tunniplaani kohal olevate päevanuppudega. Valitud vaate võib salvestada vaikevaateks ning soovi korral avada ka nädalavaate või tunniplaani välja printida.

## GitHub Pagesi seadistamine

1. Loo GitHubis uus repositoorium.
2. Lae selle projekti failid repositooriumi põhitasemele.
3. Ava **Settings → Pages**.
4. Vali avaldamise allikaks **GitHub Actions**.
5. Tee muudatus harusse `main` või käivita töövoog käsitsi.

Töövoog avaldab ainult kausta `site`, seega jäävad projekti abifailid veebilehelt välja.
