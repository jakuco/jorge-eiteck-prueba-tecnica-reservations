# AGENTS.md

## Qué es este repo
Proyecto backend en Eiteck. Estructura inicial mínima: solo `src/`
para el código fuente. Sin manifest, build, tests, linter, CI ni
`.git` todavía — esos vendrán cuando se agregue contenido a `src/`.

## Estructura
- `src/` — código fuente del backend (vacío al momento de crear este
  archivo).

## Material local (no se sube al repo)
Excluido del control de versiones; existe solo en la máquina del
usuario:
- `doc/` — referencia interna en español: un índice `.md`, una guía
  técnica `.md`, un `.docx` y una imagen. Usala como contexto; no
  la edites salvo que el usuario lo pida.
- `AGENTS.local.md` — contexto privado para el agente (preferencias
  del usuario, decisiones, notas).

## Convenciones
- No hay tooling configurado todavía; no asumas `npm` / `pnpm` /
  `pytest` / etc. hasta ver un manifest dentro de `src/`.
- No corras comandos de git salvo que el usuario lo indique.
- Al leer `doc/`, los binarios (`.docx`, `.jpeg`) requieren
  herramientas específicas, no `grep` / `cat`.