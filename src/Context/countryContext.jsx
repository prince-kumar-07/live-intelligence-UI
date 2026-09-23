import { API_BASE_URL } from "../config";
import { createContext, useState } from "react";

export const CountryContext = createContext();

export const CountryProvider = ({ children }) => {
  const [country, setCountry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newsData, setNewsData] = useState("");
  const [newsError, setNewsError] = useState(null); // { rateLimited: bool, message: string } | null
  const [liveFeed, setLiveFeed] = useState("");
  const [passport, setPassport] = useState("")
  const [allCcountriesPassportRanking, setAllCcountriesPassportRanking] = useState("")


  async function getCountry(name) {
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/countries/${name}`);
      const data = await res.json();

      setCountry(data.data);
      console.log(data.data)
      
      getNews(name)
      getLiveFeed(name)
    } catch (error) {
      console.log("Error fetching country:", error);
    } finally {
      setLoading(false);
    }
  }

   async function getNews(country) {
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/news?country=${country}`)
      const data = await res.json();

      if (!res.ok) {
        setNewsData(null);
        setNewsError({ rateLimited: !!data.rateLimited, message: data.error || "Failed to load live events" });
        return;
      }

      setNewsData(data.results);
      setNewsError(null);
      console.log(data.results)
    } catch (error) {
      console.log("Error fetching country:", error);
      setNewsError({ rateLimited: false, message: "Could not reach the server" });
    } finally {
      setLoading(false);
    }
  }

   async function getLiveFeed(country) {
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/streams?country=${country}`)
      const data = await res.json();

      setLiveFeed(data.streams);
      console.log(data.streams)
    } catch (error) {
      console.log("Error fetching country:", error);
    } finally {
      setLoading(false);
    }
  }

  async function getPassportData(name) {
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/passport/${name}`);
      const data = await res.json();

      const res2 = await fetch(`${API_BASE_URL}/countries/${name}`);
      const data2 = await res2.json();

      setCountry(data2.data);

      setPassport(data.data);
      console.log(data.data)
      
      // getNews(name)
      // getLiveFeed(name)
    } catch (error) {
      console.log("Error fetching country:", error);
    } finally {
      setLoading(false);
    }
  }

  

  return (
    <CountryContext.Provider
      value={{
        country,
        loading,
        getCountry,
        setCountry,
        newsData,
        newsError,
        liveFeed,
        getPassportData,
        passport
      }}
    >
      {children}
    </CountryContext.Provider>
  );
};