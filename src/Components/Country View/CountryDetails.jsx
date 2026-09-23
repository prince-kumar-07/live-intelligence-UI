import React, { useContext, useEffect, useState } from "react";
import { CountryContext } from "../../Context/countryContext";
import styles from "./CountryDetails.module.css";
import { useParams } from "react-router-dom";
import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";

countries.registerLocale(en);

/* ── NUMBER FORMATTER ── */
const formatNumber = (num) => {
  if (num === null || num === undefined || num === "") return "Data not available";
  if (typeof num !== "number") return num;
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(num);
};

/* Plain (non-compact) formatter — for values where "1.9K" would be
   misleading, e.g. a year (1947) or a coordinate (28.61). */
const formatPlain = (num) => {
  if (num === null || num === undefined || num === "") return "Data not available";
  if (typeof num !== "number") return num;
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
};

/* ── CODE → FULL NAME (handles both alpha-2 and alpha-3 codes) ── */
const getCountryName = (code) => countries.getName(code, "en") || code;
const namesList = (codes) => codes?.map(getCountryName).join(", ");

/* ── CLOCK HELPER (pure function, not a hook) ── */
const getCountryTime = (timezone) => {
  if (!timezone) return "Data not available";
  try {
    const match = timezone.match(/UTC([+-]\d{2}):?(\d{2})?/);
    if (!match) return "Data not available";
    const hours   = parseInt(match[1]);
    const minutes = parseInt(match[2] || 0);
    const offsetMinutes = hours * 60 + Math.sign(hours) * minutes;
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const localTime = new Date(utc + offsetMinutes * 60000);
    return localTime.toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch {
    return "Data not available";
  }
};

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
const CountryDetails = () => {

  const { country, getCountry } = useContext(CountryContext);
  const { country: countryName } = useParams();

  // ── ALL HOOKS MUST BE DECLARED BEFORE ANY EARLY RETURN ──
  const [currentTime, setCurrentTime] = useState("");

  // Fetch country data when route param changes
  useEffect(() => {
    if (countryName) getCountry(countryName);
  }, [countryName]);

  // Live clock — always runs, guards internally when data absent
  useEffect(() => {
    if (!country?.timezone) return;

    const update = () => setCurrentTime(getCountryTime(country.timezone));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [country?.timezone]);

  // ── EARLY RETURN AFTER ALL HOOKS ──
  if (!country) {
    return (
      <div className={styles.loaderWrap}>
        <div className={styles.spinner} />
        <p className={styles.loaderText}>Fetching intelligence</p>
      </div>
    );
  }

  /* timestamps */
  const lastUpdatedUTC = country.updatedAt
    ? new Date(country.updatedAt).toUTCString()
    : "Data not available";

  const lastUpdatedIST = country.updatedAt
    ? new Date(country.updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    : "Data not available";

  /* ── RENDER ── */
  return (
    <div className={styles.page}>
      <div className={styles.noise} />

      {/* HERO */}
      <header className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>Country Profile Report</span>
          <h1 className={styles.heroTitle}>{country.name}</h1>
          <div className={styles.heroSub}>
            <span className={styles.pill}>{country.capital}</span>
            <span className={styles.pill}>{country.region}</span>
            <span className={styles.pill}>{country.continent}</span>
          </div>
        </div>
      </header>

      <div className={styles.divider} />

      {/* CONTENT */}
      <main className={styles.main}>

        <Section index="01" title="General">
          <Field label="Country Code"    value={country.countryCode} />
          <Field label="ISO 3"           value={country.iso3} />
          <Field label="Continent"       value={country.continent} />
          <Field label="Population"      value={country.population} />
          <Field label="Currency"        value={country.currency} />
          <Field label="Currency Symbol" value={country.currencySymbol} />
          <Field label="Timezone"        value={country.timezone} />
          <Field label="Current Time"    value={currentTime} />
        </Section>

        <Section index="02" title="Geography">
          <Field label="Latitude"  value={country.latitude}  unit="°" formatter={formatPlain} />
          <Field label="Longitude" value={country.longitude} unit="°" formatter={formatPlain} />
          <br />
          <Field
            label="Borders"
            value={
              country.geography?.borders?.length
                ? `${country.geography.borders.length} (${namesList(country.geography.borders)})`
                : null
            }
          />
          <br />
          <Field
            label="Major Cities"
            value={
              country.geography?.majorCities?.length
                ? `${country.geography.majorCities.length} (${country.geography.majorCities.join(", ")})`
                : null
            }
          />
        </Section>

        <Section index="03" title="Demographics">
          <Field label="Population Density" value={country.demographics?.populationDensity} unit="people/km²" />
          <Field label="Median Age"         value={country.demographics?.medianAge}         unit="years" />
          <Field label="Urban Population"   value={country.demographics?.urbanPopulation}   unit="%" />
        </Section>

        <Section index="04" title="Economy">
          <Field label="GDP"                       value={country.economy?.gdp}            currency />
          <Field label="GDP Per Capita"             value={country.economy?.gdpPerCapita}   currency />
          <Field label="Inflation Rate"             value={country.economy?.inflationRate}  unit="%" />
          <Field label="Unemployment Rate"          value={country.economy?.unemploymentRate} unit="%" />
          <Field label="Government Debt (% of GDP)" value={country.economy?.governmentDebtPercentGDP} unit="%" />
        </Section>

        <Section index="05" title="Infrastructure">
          <Field label="Internet Penetration"  value={country.infrastructure?.internetPenetration}  unit="%" />
          <Field label="Mobile Subscriptions"  value={country.infrastructure?.mobileSubscriptions}  unit="per 100 people" />
          <Field label="Broadband Subscriptions" value={country.infrastructure?.broadbandSubscriptions} unit="per 100 people" />
          <Field label="Cloud Regions"         value={country.infrastructure?.cloudRegions} />
          <Field label="Data Centers"          value={country.infrastructure?.dataCenters} />
          <Field label="Submarine Cables"      value={country.infrastructure?.submarineCables} />
        </Section>

        <Section index="06" title="Cyber Intelligence">
          <Field label="Security Index"       value={country.cyber?.cyberSecurityIndex} unit="/ 100" />
          <Field label="Data Breaches"        value={country.cyber?.dataBreaches}       unit="incidents" />
          <Field label="Malware Incidents"    value={country.cyber?.malwareIncidents}   unit="incidents" />
          <Field label="Phishing Incidents"   value={country.cyber?.phishingIncidents}  unit="incidents" />
          <Field label="Ransomware Incidents" value={country.cyber?.ransomwareIncidents} unit="incidents" />
        </Section>

        <Section index="07" title="Government">
          <Field label="Government Type"           value={country.government?.governmentType} />
          <Field label="Head of State"              value={country.government?.headOfState} />
          <Field label="UN Member"                  value={country.government?.unMember  === undefined ? null : (country.government.unMember  ? "Yes" : "No")} />
          <Field label="EU Member"                  value={country.government?.euMember  === undefined ? null : (country.government.euMember  ? "Yes" : "No")} />
          <Field label="NATO Member"                value={country.government?.natoMember === undefined ? null : (country.government.natoMember ? "Yes" : "No")} />
          <Field label="Independence Year"          value={country.government?.independenceYear} formatter={formatPlain} />
          <Field label="Total Expenditure (% of GDP)" value={country.government?.totalExpenditurePercentGDP} unit="%" />
        </Section>

        <Section index="08" title="Energy">
          <Field label="Oil Production"         value={country.energy?.oilProduction} />
          <Field label="Oil Reserves"           value={country.energy?.oilReserves} />
          <Field label="Electricity Production" value={country.energy?.electricityProduction} />
          <Field label="Renewable Energy"       value={country.energy?.renewableEnergyPercent} unit="%" />
          <Field label="Electricity Access"     value={country.energy?.electricityAccessPercent} unit="%" />
        </Section>

        <Section index="09" title="Military">
          <Field label="Active Personnel"           value={country.military?.activePersonnel}  unit="personnel" />
          <Field label="Reserve Personnel"          value={country.military?.reservePersonnel} unit="personnel" />
          <Field label="Defense Budget"              value={country.military?.defenseBudget}    currency />
          <Field label="Defense Budget (% of GDP)"   value={country.military?.defenseBudgetPercentGDP} unit="%" />
          <Field label="Nuclear Weapons"             value={country.military?.nuclearWeapons}   unit="warheads" />
        </Section>

        <Section index="10" title="Risk Intelligence">
          <Field label="Political Stability" value={country.risk?.politicalStability} />
          <Field label="Terrorism Index"     value={country.risk?.terrorismIndex} />
          <Field label="Disaster Risk Index" value={country.risk?.disasterRiskIndex} />
        </Section>

        <Section index="11" title="Trade">
          <Field label="Exports"               value={country.trade?.exports}       currency />
          <Field label="Imports"               value={country.trade?.imports}       currency />
          <Field label="Trade Balance"         value={country.trade?.tradeBalance}  currency />
          <Field label="Major Export Partners" value={namesList(country.trade?.majorExportPartners) || null} />
        </Section>

        <Section index="12" title="Tech Ecosystem">
          <Field label="Startups"                    value={country.tech?.startups}    unit="companies" />
          <Field label="Unicorns"                    value={country.tech?.unicorns}    unit="companies" />
          <Field label="Tech Talent Rank"             value={country.tech?.techTalentRank} formatter={formatPlain} />
          <Field label="R&D Expenditure (% of GDP)"   value={country.tech?.rdExpenditurePercentGDP} unit="%" />
        </Section>

        <Section index="13" title="Transport">
          <Field label="Airports"    value={country.transport?.airports} />
          <Field label="Seaports"    value={country.transport?.seaports} />
          <Field label="Rail Length" value={country.transport?.railLength} unit="km" />
          <Field label="Road Length" value={country.transport?.roadLength} unit="km" />
        </Section>

        <Section index="14" title="Climate">
          <Field label="CO2 Emissions"            value={country.climate?.co2Emissions} unit="t / capita" />
          <Field label="Climate Risk Index"        value={country.climate?.climateRiskIndex} />
          <Field label="Natural Disasters / Year"  value={country.climate?.naturalDisastersPerYear} unit="per year" />
        </Section>

        <Section index="15" title="Health">
          <Field label="Life Expectancy"                value={country.health?.lifeExpectancy} unit="years" />
          <Field label="Health Expenditure (% of GDP)"  value={country.health?.healthExpenditurePercentGDP} unit="%" />
          <Field label="Hospital Beds"                  value={country.health?.hospitalBedsPerThousand} unit="per 1,000 people" />
        </Section>

        <Section index="16" title="Education">
          <Field label="Literacy Rate"                    value={country.education?.literacyRate} unit="%" />
          <Field label="Secondary Enrollment"             value={country.education?.secondaryEnrollmentRate} unit="%" />
          <Field label="Education Expenditure (% of GDP)" value={country.education?.educationExpenditurePercentGDP} unit="%" />
        </Section>

        <Section index="17" title="Tourism">
          <Field label="Tourist Arrivals"  value={country.tourism?.touristArrivals} unit="visitors" />
          <Field label="Tourism Receipts"  value={country.tourism?.tourismReceipts} currency />
        </Section>

        <Section index="18" title="Agriculture">
          <Field label="Arable Land"          value={country.agriculture?.arableLandPercent} unit="%" />
          <Field label="Agricultural Land"    value={country.agriculture?.agriculturalLandPercent} unit="%" />
          <Field label="Food Production Index" value={country.agriculture?.foodProductionIndex} unit="(2014–16 = 100)" />
        </Section>

        <Section index="19" title="Poverty & Inequality">
          <Field label="Poverty Headcount Ratio"    value={country.poverty?.povertyHeadcountRatio} unit="%" />
          <Field label="Income Share — Top 10%"     value={country.poverty?.incomeShareTop10} unit="%" />
          <Field label="Income Share — Bottom 10%"  value={country.poverty?.incomeShareBottom10} unit="%" />
        </Section>

        <Section index="20" title="Labor & Employment">
          <Field label="Labor Force Participation" value={country.labor?.laborForceParticipationRate} unit="%" />
          <Field label="Employment — Agriculture"  value={country.labor?.employmentAgriculturePercent} unit="%" />
          <Field label="Employment — Industry"     value={country.labor?.employmentIndustryPercent} unit="%" />
          <Field label="Employment — Services"     value={country.labor?.employmentServicesPercent} unit="%" />
        </Section>

        <Section index="21" title="Water & Sanitation">
          <Field label="Clean Water Access"       value={country.sanitation?.cleanWaterAccessPercent} unit="%" />
          <Field label="Basic Sanitation Access"  value={country.sanitation?.basicSanitationAccessPercent} unit="%" />
        </Section>

        <Section index="22" title="Gender">
          <Field label="Female Labor Force Participation" value={country.gender?.femaleLaborForceParticipationRate} unit="%" />
          <Field label="Women in Parliament"               value={country.gender?.womenInParliamentPercent} unit="%" />
        </Section>

        {/* Rankings */}
        <section className={styles.rankSection}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionIndex}>
              <span className={styles.dot} />23
            </span>
            <h2 className={styles.sectionTitle}>Global Rankings</h2>
          </div>
          <div className={styles.rankGrid}>
            <RankBar label="Passport"      value={country.rankings?.passportRank} />
            <RankBar label="Happiness"     value={country.rankings?.happinessRank} />
            <RankBar label="Peace"         value={country.rankings?.peaceRank} />
            <RankBar label="Military"      value={country.rankings?.militaryRank} />
            <RankBar label="Corruption"    value={country.rankings?.corruptionIndex} />
            <RankBar label="Cyber Security"value={country.rankings?.cyberSecurityIndexRank} />
            <RankBar label="Democracy"     value={country.rankings?.democracyIndex} />
            <RankBar label="HDI"           value={country.rankings?.hdiIndex} />
            <RankBar label="Innovation"    value={country.rankings?.innovationIndex} />
            <RankBar label="Press Freedom" value={country.rankings?.pressFreedomIndex} />
          </div>
        </section>

        <div className={styles.updateInfo}>
          <div className={styles.updateRow}>
            <span className={styles.updateLabel}>Last Updated (UTC)</span>
            <span className={styles.updateValue}>{lastUpdatedUTC}</span>
          </div>
          <div className={styles.updateRow}>
            <span className={styles.updateLabel}>Last Updated (IST)</span>
            <span className={styles.updateValue}>{lastUpdatedIST}</span>
          </div>
        </div>

      </main>
    </div>
  );
};

/* ── HELPERS ── */

const Section = ({ index, title, children }) => (
  <section className={styles.section}>
    <div className={styles.sectionHead}>
      <span className={styles.sectionIndex}>
        <span className={styles.dot} />{index}
      </span>
      <h2 className={styles.sectionTitle}>{title}</h2>
    </div>
    <div className={styles.fieldGrid}>{children}</div>
  </section>
);

/* Renders a label/value pair. Units/currency prefixes are only ever
   appended when `value` is actually present — this is what fixes the old
   "Data not available %" bug (the unit used to be string-concatenated
   onto the formatted value unconditionally, even when that value was the
   "Data not available" fallback string itself). */
const Field = ({ label, value, unit, currency, formatter = formatNumber }) => {
  const isMissing = value === null || value === undefined || value === "";

  let display = "Data not available";
  if (!isMissing) {
    display = typeof value === "number" ? formatter(value) : String(value);
    if (unit) display += ` ${unit}`;
    if (currency) display = `$ ${display}`;
  }

  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{display}</span>
    </div>
  );
};

const RankBar = ({ label, value }) => {
  if (value === null || value === undefined) {
    return (
      <div className={styles.rankItem}>
        <div className={styles.rankMeta}>
          <span className={styles.rankLabel}>{label}</span>
          <span className={styles.rankValue}>Data not available</span>
        </div>
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: "0%" }} />
        </div>
      </div>
    );
  }

  const pct = Math.min(100, (200 - value) / 2);

  return (
    <div className={styles.rankItem}>
      <div className={styles.rankMeta}>
        <span className={styles.rankLabel}>{label}</span>
        <span className={styles.rankValue}>#{value}</span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export default CountryDetails;
