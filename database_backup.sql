--
-- PostgreSQL database dump
--

\restrict E86zEQolinaqIxbYcLUoR3BU9xrqoZqOqRm1LXfhL56DvwrMj4i386XsJxxdmGs

-- Dumped from database version 16.10 (Debian 16.10-1.pgdg13+1)
-- Dumped by pg_dump version 16.10 (Debian 16.10-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: anime_season; Type: TYPE; Schema: public; Owner: mal_user
--

CREATE TYPE public.anime_season AS ENUM (
    'winter',
    'spring',
    'summer',
    'fall'
);


ALTER TYPE public.anime_season OWNER TO mal_user;

--
-- Name: anime_status; Type: TYPE; Schema: public; Owner: mal_user
--

CREATE TYPE public.anime_status AS ENUM (
    'Finished Airing',
    'Currently Airing',
    'Not yet aired'
);


ALTER TYPE public.anime_status OWNER TO mal_user;

--
-- Name: anime_type; Type: TYPE; Schema: public; Owner: mal_user
--

CREATE TYPE public.anime_type AS ENUM (
    'TV',
    'OVA',
    'Movie',
    'Special',
    'ONA',
    'Music'
);


ALTER TYPE public.anime_type OWNER TO mal_user;

--
-- Name: genre_type; Type: TYPE; Schema: public; Owner: mal_user
--

CREATE TYPE public.genre_type AS ENUM (
    'genre',
    'explicit_genre',
    'theme',
    'demographic'
);


ALTER TYPE public.genre_type OWNER TO mal_user;

--
-- Name: studio_role; Type: TYPE; Schema: public; Owner: mal_user
--

CREATE TYPE public.studio_role AS ENUM (
    'studio',
    'producer',
    'licensor'
);


ALTER TYPE public.studio_role OWNER TO mal_user;

--
-- Name: update_anime_search_vector(); Type: FUNCTION; Schema: public; Owner: mal_user
--

CREATE FUNCTION public.update_anime_search_vector() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', NEW.title), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.title_english, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.title_japanese, '')), 'B') ||
        setweight(to_tsvector('english', array_to_string(COALESCE(NEW.title_synonyms, ARRAY[]::text[]), ' ')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.synopsis, '')), 'C');
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_anime_search_vector() OWNER TO mal_user;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: mal_user
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO mal_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: anime; Type: TABLE; Schema: public; Owner: mal_user
--

CREATE TABLE public.anime (
    mal_id integer NOT NULL,
    title character varying(500) NOT NULL,
    title_english character varying(500),
    title_japanese character varying(500),
    title_synonyms text[],
    image_url character varying(1000),
    type public.anime_type,
    source character varying(100),
    episodes integer,
    status public.anime_status,
    airing boolean DEFAULT false,
    aired_from date,
    aired_to date,
    duration character varying(100),
    rating character varying(50),
    score numeric(4,2),
    scored_by integer,
    rank integer,
    popularity integer,
    members integer,
    favorites integer,
    synopsis text,
    background text,
    season public.anime_season,
    year integer,
    images jsonb,
    trailer jsonb,
    broadcast jsonb,
    statistics jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_scraped timestamp with time zone DEFAULT now(),
    search_vector tsvector
);


ALTER TABLE public.anime OWNER TO mal_user;

--
-- Name: anime_genres; Type: TABLE; Schema: public; Owner: mal_user
--

CREATE TABLE public.anime_genres (
    anime_id integer NOT NULL,
    genre_id integer NOT NULL,
    genre_type public.genre_type DEFAULT 'genre'::public.genre_type NOT NULL
);


ALTER TABLE public.anime_genres OWNER TO mal_user;

--
-- Name: anime_studios; Type: TABLE; Schema: public; Owner: mal_user
--

CREATE TABLE public.anime_studios (
    anime_id integer NOT NULL,
    studio_id integer NOT NULL,
    role public.studio_role NOT NULL
);


ALTER TABLE public.anime_studios OWNER TO mal_user;

--
-- Name: genres; Type: TABLE; Schema: public; Owner: mal_user
--

CREATE TABLE public.genres (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    url character varying(500),
    count integer DEFAULT 0,
    type public.genre_type DEFAULT 'genre'::public.genre_type NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.genres OWNER TO mal_user;

--
-- Name: studios; Type: TABLE; Schema: public; Owner: mal_user
--

CREATE TABLE public.studios (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    url character varying(500),
    type character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.studios OWNER TO mal_user;

--
-- Name: anime_with_basic_info; Type: VIEW; Schema: public; Owner: mal_user
--

CREATE VIEW public.anime_with_basic_info AS
 SELECT a.mal_id,
    a.title,
    a.title_english,
    a.title_japanese,
    a.image_url,
    a.type,
    a.episodes,
    a.status,
    a.score,
    a.rank,
    a.popularity,
    a.year,
    a.season,
    COALESCE(array_agg(DISTINCT g.name) FILTER (WHERE (ag.genre_type = 'genre'::public.genre_type)), (ARRAY[]::text[])::character varying[]) AS genres,
    COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE (asu.role = 'studio'::public.studio_role)), (ARRAY[]::text[])::character varying[]) AS studios
   FROM ((((public.anime a
     LEFT JOIN public.anime_genres ag ON (((a.mal_id = ag.anime_id) AND (ag.genre_type = 'genre'::public.genre_type))))
     LEFT JOIN public.genres g ON ((ag.genre_id = g.id)))
     LEFT JOIN public.anime_studios asu ON (((a.mal_id = asu.anime_id) AND (asu.role = 'studio'::public.studio_role))))
     LEFT JOIN public.studios s ON ((asu.studio_id = s.id)))
  GROUP BY a.mal_id, a.title, a.title_english, a.title_japanese, a.image_url, a.type, a.episodes, a.status, a.score, a.rank, a.popularity, a.year, a.season;


ALTER VIEW public.anime_with_basic_info OWNER TO mal_user;

--
-- Data for Name: anime; Type: TABLE DATA; Schema: public; Owner: mal_user
--

COPY public.anime (mal_id, title, title_english, title_japanese, title_synonyms, image_url, type, source, episodes, status, airing, aired_from, aired_to, duration, rating, score, scored_by, rank, popularity, members, favorites, synopsis, background, season, year, images, trailer, broadcast, statistics, created_at, updated_at, last_scraped, search_vector) FROM stdin;
\.


--
-- Data for Name: anime_genres; Type: TABLE DATA; Schema: public; Owner: mal_user
--

COPY public.anime_genres (anime_id, genre_id, genre_type) FROM stdin;
\.


--
-- Data for Name: anime_studios; Type: TABLE DATA; Schema: public; Owner: mal_user
--

COPY public.anime_studios (anime_id, studio_id, role) FROM stdin;
\.


--
-- Data for Name: genres; Type: TABLE DATA; Schema: public; Owner: mal_user
--

COPY public.genres (id, name, url, count, type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: studios; Type: TABLE DATA; Schema: public; Owner: mal_user
--

COPY public.studios (id, name, url, type, created_at, updated_at) FROM stdin;
\.


--
-- Name: anime_genres anime_genres_pkey; Type: CONSTRAINT; Schema: public; Owner: mal_user
--

ALTER TABLE ONLY public.anime_genres
    ADD CONSTRAINT anime_genres_pkey PRIMARY KEY (anime_id, genre_id, genre_type);


--
-- Name: anime anime_pkey; Type: CONSTRAINT; Schema: public; Owner: mal_user
--

ALTER TABLE ONLY public.anime
    ADD CONSTRAINT anime_pkey PRIMARY KEY (mal_id);


--
-- Name: anime_studios anime_studios_pkey; Type: CONSTRAINT; Schema: public; Owner: mal_user
--

ALTER TABLE ONLY public.anime_studios
    ADD CONSTRAINT anime_studios_pkey PRIMARY KEY (anime_id, studio_id, role);


--
-- Name: genres genres_name_key; Type: CONSTRAINT; Schema: public; Owner: mal_user
--

ALTER TABLE ONLY public.genres
    ADD CONSTRAINT genres_name_key UNIQUE (name);


--
-- Name: genres genres_pkey; Type: CONSTRAINT; Schema: public; Owner: mal_user
--

ALTER TABLE ONLY public.genres
    ADD CONSTRAINT genres_pkey PRIMARY KEY (id);


--
-- Name: studios studios_pkey; Type: CONSTRAINT; Schema: public; Owner: mal_user
--

ALTER TABLE ONLY public.studios
    ADD CONSTRAINT studios_pkey PRIMARY KEY (id);


--
-- Name: idx_anime_genres_anime_id; Type: INDEX; Schema: public; Owner: mal_user
--

CREATE INDEX idx_anime_genres_anime_id ON public.anime_genres USING btree (anime_id);


--
-- Name: idx_anime_genres_genre_id; Type: INDEX; Schema: public; Owner: mal_user
--

CREATE INDEX idx_anime_genres_genre_id ON public.anime_genres USING btree (genre_id);


--
-- Name: idx_anime_genres_type; Type: INDEX; Schema: public; Owner: mal_user
--

CREATE INDEX idx_anime_genres_type ON public.anime_genres USING btree (genre_type);


--
-- Name: idx_anime_popularity; Type: INDEX; Schema: public; Owner: mal_user
--

CREATE INDEX idx_anime_popularity ON public.anime USING btree (popularity) WHERE (popularity IS NOT NULL);


--
-- Name: idx_anime_rank; Type: INDEX; Schema: public; Owner: mal_user
--

CREATE INDEX idx_anime_rank ON public.anime USING btree (rank) WHERE (rank IS NOT NULL);


--
-- Name: idx_anime_score; Type: INDEX; Schema: public; Owner: mal_user
--

CREATE INDEX idx_anime_score ON public.anime USING btree (score DESC) WHERE (score IS NOT NULL);


--
-- Name: idx_anime_search_vector; Type: INDEX; Schema: public; Owner: mal_user
--

CREATE INDEX idx_anime_search_vector ON public.anime USING gin (search_vector);


--
-- Name: idx_anime_season_year; Type: INDEX; Schema: public; Owner: mal_user
--

CREATE INDEX idx_anime_season_year ON public.anime USING btree (year DESC, season) WHERE ((year IS NOT NULL) AND (season IS NOT NULL));


--
-- Name: idx_anime_status; Type: INDEX; Schema: public; Owner: mal_user
--

CREATE INDEX idx_anime_status ON public.anime USING btree (status) WHERE (status IS NOT NULL);


--
-- Name: idx_anime_studios_anime_id; Type: INDEX; Schema: public; Owner: mal_user
--

CREATE INDEX idx_anime_studios_anime_id ON public.anime_studios USING btree (anime_id);


--
-- Name: idx_anime_studios_role; Type: INDEX; Schema: public; Owner: mal_user
--

CREATE INDEX idx_anime_studios_role ON public.anime_studios USING btree (role);


--
-- Name: idx_anime_studios_studio_id; Type: INDEX; Schema: public; Owner: mal_user
--

CREATE INDEX idx_anime_studios_studio_id ON public.anime_studios USING btree (studio_id);


--
-- Name: idx_anime_synopsis; Type: INDEX; Schema: public; Owner: mal_user
--

CREATE INDEX idx_anime_synopsis ON public.anime USING gin (to_tsvector('english'::regconfig, COALESCE(synopsis, ''::text)));


--
-- Name: idx_anime_title; Type: INDEX; Schema: public; Owner: mal_user
--

CREATE INDEX idx_anime_title ON public.anime USING gin (to_tsvector('english'::regconfig, (title)::text));


--
-- Name: idx_anime_title_english; Type: INDEX; Schema: public; Owner: mal_user
--

CREATE INDEX idx_anime_title_english ON public.anime USING gin (to_tsvector('english'::regconfig, (COALESCE(title_english, ''::character varying))::text));


--
-- Name: idx_anime_type; Type: INDEX; Schema: public; Owner: mal_user
--

CREATE INDEX idx_anime_type ON public.anime USING btree (type) WHERE (type IS NOT NULL);


--
-- Name: idx_anime_year; Type: INDEX; Schema: public; Owner: mal_user
--

CREATE INDEX idx_anime_year ON public.anime USING btree (year DESC) WHERE (year IS NOT NULL);


--
-- Name: idx_genres_name; Type: INDEX; Schema: public; Owner: mal_user
--

CREATE INDEX idx_genres_name ON public.genres USING btree (name);


--
-- Name: idx_genres_type; Type: INDEX; Schema: public; Owner: mal_user
--

CREATE INDEX idx_genres_type ON public.genres USING btree (type);


--
-- Name: idx_studios_name; Type: INDEX; Schema: public; Owner: mal_user
--

CREATE INDEX idx_studios_name ON public.studios USING btree (name);


--
-- Name: anime trigger_anime_updated_at; Type: TRIGGER; Schema: public; Owner: mal_user
--

CREATE TRIGGER trigger_anime_updated_at BEFORE UPDATE ON public.anime FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: genres trigger_genres_updated_at; Type: TRIGGER; Schema: public; Owner: mal_user
--

CREATE TRIGGER trigger_genres_updated_at BEFORE UPDATE ON public.genres FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: studios trigger_studios_updated_at; Type: TRIGGER; Schema: public; Owner: mal_user
--

CREATE TRIGGER trigger_studios_updated_at BEFORE UPDATE ON public.studios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: anime trigger_update_anime_search_vector; Type: TRIGGER; Schema: public; Owner: mal_user
--

CREATE TRIGGER trigger_update_anime_search_vector BEFORE INSERT OR UPDATE ON public.anime FOR EACH ROW EXECUTE FUNCTION public.update_anime_search_vector();


--
-- Name: anime_genres anime_genres_anime_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mal_user
--

ALTER TABLE ONLY public.anime_genres
    ADD CONSTRAINT anime_genres_anime_id_fkey FOREIGN KEY (anime_id) REFERENCES public.anime(mal_id) ON DELETE CASCADE;


--
-- Name: anime_genres anime_genres_genre_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mal_user
--

ALTER TABLE ONLY public.anime_genres
    ADD CONSTRAINT anime_genres_genre_id_fkey FOREIGN KEY (genre_id) REFERENCES public.genres(id) ON DELETE CASCADE;


--
-- Name: anime_studios anime_studios_anime_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mal_user
--

ALTER TABLE ONLY public.anime_studios
    ADD CONSTRAINT anime_studios_anime_id_fkey FOREIGN KEY (anime_id) REFERENCES public.anime(mal_id) ON DELETE CASCADE;


--
-- Name: anime_studios anime_studios_studio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mal_user
--

ALTER TABLE ONLY public.anime_studios
    ADD CONSTRAINT anime_studios_studio_id_fkey FOREIGN KEY (studio_id) REFERENCES public.studios(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict E86zEQolinaqIxbYcLUoR3BU9xrqoZqOqRm1LXfhL56DvwrMj4i386XsJxxdmGs

