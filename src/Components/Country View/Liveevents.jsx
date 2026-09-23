import { useContext } from "react";
import styles from "./LiveEvents.module.css";
import { CountryContext } from "../../Context/countryContext"

const SEVERITY_COLOR = {
  high: "var(--red)",
  medium: "var(--amber)",
  low: "var(--green)",
};

export default function LiveEvents({ countryName }) {

  const { newsData, newsError } = useContext(CountryContext);

  // Convert API data to UI event format
  const events = newsData
    ? Object.entries(newsData).flatMap(([category, articles]) =>
        articles.map((a, i) => ({
          id: `${category}-${i}`,
          type: category,
          severity:
            category === "military"
              ? "high"
              : category === "crime"
              ? "medium"
              : category === "disaster"
              ? "medium"
              : "low",
          title: a.title,
          time: "live",
          desc: a.source,
        }))
      )
    : [];

  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>

        <div className={styles.head}>
          <div className={styles.headLeft}>
            <span className={styles.eyebrow}>
              <span className={styles.liveDot} />
              Live Feed
            </span>
            <h2 className={styles.title}>Events — {countryName}</h2>
          </div>

          <span className={styles.count}>{events.length} active</span>
        </div>

        {newsError && (
          <div className={styles.emptyState}>
            <span className={styles.emptyTitle}>
              {newsError.rateLimited ? "Live news temporarily rate-limited" : "Could not load live events"}
            </span>
            <span className={styles.emptySub}>
              {newsError.rateLimited
                ? "The news source is throttling requests — try again in a minute."
                : newsError.message}
            </span>
          </div>
        )}

        {!newsError && events.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyTitle}>No recent events</span>
            <span className={styles.emptySub}>No matching news found for {countryName} in the last 24h.</span>
          </div>
        )}

        <div className={styles.list}>
          {events.map((ev, i) => (
            <div
              key={ev.id}
              className={styles.event}
              style={{ animationDelay: `${i * 0.06}s` }}
            >

              <div className={styles.eventLeft}>
                <span
                  className={styles.dot}
                  style={{ background: SEVERITY_COLOR[ev.severity] }}
                />
              </div>

              <div className={styles.eventBody}>

                <div className={styles.eventTop}>
                  <span className={styles.eventType}>{ev.type}</span>
                  <span className={styles.eventTime}>{ev.time}</span>
                </div>

                <h3 className={styles.eventTitle}>{ev.title}</h3>

                <p className={styles.eventDesc}>{ev.desc}</p>

              </div>

              <span
                className={styles.severityBadge}
                data-severity={ev.severity}
              >
                {ev.severity}
              </span>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
}