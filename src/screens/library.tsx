import { useState } from "preact/hooks";
import { Header, Rich, go } from "../ui/common";
import { Goban } from "../ui/Goban";
import { Board } from "../go/board";
import { ARTICLES, GLOSSARY, PROVERBS } from "../content/library";
import { store } from "../store";

export function LibraryScreen() {
  const groups = Array.from(new Set(ARTICLES.map((a) => a.group)));
  return (
    <>
      <Header sub="Bibliothèque" />
      <div class="stack">
        <div class="grid">
          <a class="tile" href="#/glossaire"><span class="eyebrow">Référence</span><b>Glossaire</b><small>{GLOSSARY.length} termes, du français au japonais</small></a>
          <a class="tile" href="#/proverbes"><span class="eyebrow">Sagesse</span><b>Proverbes du go</b><small>{PROVERBS.length} maximes expliquées</small></a>
        </div>
        {groups.map((g) => (
          <section key={g} class="stack" style="gap:6px">
            <div class="section-title"><h3>{g}</h3></div>
            <div class="list">
              {ARTICLES.filter((a) => a.group === g).map((a) => (
                <a class="item" key={a.id} href={`#/article/${a.id}`} style="grid-template-columns:1fr auto">
                  <span class="t"><b>{a.title}</b><small>{a.sub}</small></span>
                  <span class="chip">Lire</span>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

export function ArticleScreen(props: { id: string }) {
  const a = ARTICLES.find((x) => x.id === props.id);
  if (!a) return <><Header sub="Bibliothèque" back="bibliotheque" /><p>Article introuvable.</p></>;
  return (
    <>
      <Header sub={a.group} back={() => go("bibliotheque")} />
      <article class="stack">
        <div><h1>{a.title}</h1><p class="muted">{a.sub}</p></div>
        {a.body.map((b, i) => {
          if ("p" in b) return <Rich key={i} text={b.p} />;
          if ("h" in b) return <h3 key={i}>{b.h}</h3>;
          if ("list" in b) return <Rich key={i} text={b.list.map((l) => (/^\d+\./.test(l) ? l : "- " + l)).join("\n")} />;
          if ("quote" in b) return <blockquote key={i} class="card"><Rich text={b.quote} />{b.by && <p class="small muted">— {b.by}</p>}</blockquote>;
          if ("link" in b) return <a key={i} class="card" href={b.link} target="_blank" rel="noopener" style="text-decoration:none;color:var(--ink)"><b>{b.label}</b>{b.note && <p class="small muted">{b.note}</p>}<span class="small" style="color:var(--accent)">{b.link.replace(/^https?:\/\//, "")} ↗</span></a>;
          if ("board" in b) return <figure key={i} class="stack" style="margin:0;gap:6px"><Goban board={Board.fromRows(b.board)} coords={store.settings.coords} view={b.view} />{b.caption && <figcaption class="small muted">{b.caption}</figcaption>}</figure>;
          return null;
        })}
      </article>
    </>
  );
}

export function GlossaryScreen() {
  const [q, setQ] = useState("");
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const list = GLOSSARY.filter((g) => !q || norm(g.term + " " + g.def + " " + (g.jp || "")).includes(norm(q))).sort((a, b) => a.term.localeCompare(b.term, "fr"));
  return (
    <>
      <Header sub="Glossaire" back={() => go("bibliotheque")} />
      <div class="stack">
        <input type="search" id="gloss-q" placeholder="Chercher un terme (atari, sente, œil…)" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} aria-label="Chercher dans le glossaire" />
        <dl class="gloss" style="margin:0">
          {list.map((g) => (
            <div key={g.term}><dt>{g.term}{g.jp && <span class="jp">{g.jp}</span>}</dt><dd>{g.def}</dd></div>
          ))}
        </dl>
        {!list.length && <p class="muted">Aucun terme trouvé.</p>}
      </div>
    </>
  );
}

export function ProverbsScreen() {
  return (
    <>
      <Header sub="Proverbes" back={() => go("bibliotheque")} />
      <div class="stack">
        <p class="muted">Les joueurs se transmettent depuis des siècles des maximes courtes, faciles à retenir pendant une partie.</p>
        {PROVERBS.map((p, i) => (
          <div class="card" key={i}><p style="font-family:var(--f-display);font-weight:600;font-size:18px">« {p.fr} »</p><p class="small muted" style="margin-top:4px">{p.explain}</p></div>
        ))}
      </div>
    </>
  );
}
