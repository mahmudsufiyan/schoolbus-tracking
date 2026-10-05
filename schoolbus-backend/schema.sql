--
-- PostgreSQL database dump
--

\restrict kqGCAatovbB4AjvnysQfrAt8zdpgTcDrGA14PVmBaQbTV3LzN8wxFqQBH3Takuh

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: generate_student_qr(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_student_qr() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.qr_token IS NULL OR NEW.qr_token = '' THEN
        NEW.qr_token := md5(random()::text || clock_timestamp()::text || NEW.id::text)
                     || md5(random()::text || NEW.id::text);
        NEW.qr_token_expires := NOW() + INTERVAL '1 year';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.generate_student_qr() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: buses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.buses (
    id integer NOT NULL,
    bus_number character varying(20) NOT NULL,
    plate_number character varying(20) NOT NULL,
    capacity integer DEFAULT 40,
    driver_id integer,
    current_latitude numeric(10,8),
    current_longitude numeric(11,8),
    last_updated timestamp without time zone,
    status character varying(20) DEFAULT 'inactive'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    current_lat numeric(10,8),
    current_lng numeric(11,8),
    last_location_update timestamp without time zone,
    CONSTRAINT buses_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'maintenance'::character varying, 'on_route'::character varying, 'on-route'::character varying])::text[])))
);


ALTER TABLE public.buses OWNER TO postgres;

--
-- Name: buses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.buses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.buses_id_seq OWNER TO postgres;

--
-- Name: buses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.buses_id_seq OWNED BY public.buses.id;


--
-- Name: daily_attendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_attendance (
    id integer NOT NULL,
    student_id integer,
    bus_id integer,
    boarded_at timestamp without time zone DEFAULT now(),
    boarded_date date GENERATED ALWAYS AS (date(boarded_at)) STORED,
    checked_by_driver integer,
    is_on_bus boolean DEFAULT true
);


ALTER TABLE public.daily_attendance OWNER TO postgres;

--
-- Name: daily_attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.daily_attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.daily_attendance_id_seq OWNER TO postgres;

--
-- Name: daily_attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_attendance_id_seq OWNED BY public.daily_attendance.id;


--
-- Name: driver_registrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.driver_registrations (
    id integer NOT NULL,
    user_id integer,
    license_number character varying(50),
    experience integer,
    verified_by integer,
    verified_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.driver_registrations OWNER TO postgres;

--
-- Name: driver_registrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.driver_registrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.driver_registrations_id_seq OWNER TO postgres;

--
-- Name: driver_registrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.driver_registrations_id_seq OWNED BY public.driver_registrations.id;


--
-- Name: emergency_alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emergency_alerts (
    id integer NOT NULL,
    bus_id integer,
    driver_id integer,
    latitude numeric(10,8),
    longitude numeric(11,8),
    message text,
    status character varying(20) DEFAULT 'active'::character varying,
    resolved_by integer,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    acknowledged_by integer,
    acknowledged_at timestamp without time zone,
    responded_by integer,
    responded_at timestamp without time zone,
    CONSTRAINT emergency_alerts_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'acknowledged'::character varying, 'responding'::character varying, 'resolved'::character varying])::text[])))
);


ALTER TABLE public.emergency_alerts OWNER TO postgres;

--
-- Name: emergency_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emergency_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emergency_alerts_id_seq OWNER TO postgres;

--
-- Name: emergency_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emergency_alerts_id_seq OWNED BY public.emergency_alerts.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    parent_id integer,
    title character varying(255) NOT NULL,
    message text,
    type character varying(50),
    read boolean DEFAULT false,
    related_bus_id integer,
    related_student_id integer,
    created_at timestamp without time zone DEFAULT now(),
    metadata jsonb,
    CONSTRAINT notifications_type_check CHECK (((type)::text = ANY (ARRAY['info'::text, 'success'::text, 'warning'::text, 'error'::text, 'trip-started'::text, 'trip-ended'::text, 'student-scanned'::text, 'student-update'::text, 'pickup-time'::text, 'stop-arrived'::text, 'stop-approaching'::text, 'emergency'::text, 'alert-update'::text, 'alert-resolved'::text, 'driver-assigned'::text, 'student-picked-up'::text, 'student-dropped-off'::text, 'dropoff-confirmed'::text])))
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: parent_registrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parent_registrations (
    id integer NOT NULL,
    user_id integer,
    full_name character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    phone character varying(20) NOT NULL,
    address text,
    date_of_birth date,
    gender character varying(10),
    occupation character varying(100),
    emergency_contact character varying(20),
    relationship_to_student character varying(50),
    student_name character varying(100),
    student_grade character varying(20),
    student_school character varying(100),
    student_id_number character varying(50),
    status character varying(20) DEFAULT 'pending'::character varying,
    admin_notes text,
    approved_by integer,
    approved_at timestamp without time zone,
    rejected_reason text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT parent_registrations_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.parent_registrations OWNER TO postgres;

--
-- Name: parent_registrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.parent_registrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.parent_registrations_id_seq OWNER TO postgres;

--
-- Name: parent_registrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.parent_registrations_id_seq OWNED BY public.parent_registrations.id;


--
-- Name: police_registrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.police_registrations (
    id integer NOT NULL,
    user_id integer,
    badge_number character varying(50),
    station character varying(100),
    verified_by integer,
    verified_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.police_registrations OWNER TO postgres;

--
-- Name: police_registrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.police_registrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.police_registrations_id_seq OWNER TO postgres;

--
-- Name: police_registrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.police_registrations_id_seq OWNED BY public.police_registrations.id;


--
-- Name: stop_arrivals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stop_arrivals (
    id integer NOT NULL,
    trip_id integer,
    stop_id integer,
    bus_id integer,
    arrived_at timestamp with time zone DEFAULT now(),
    stage character varying(20) DEFAULT 'arrived'::character varying
);


ALTER TABLE public.stop_arrivals OWNER TO postgres;

--
-- Name: stop_arrivals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stop_arrivals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stop_arrivals_id_seq OWNER TO postgres;

--
-- Name: stop_arrivals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stop_arrivals_id_seq OWNED BY public.stop_arrivals.id;


--
-- Name: stops; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stops (
    id integer NOT NULL,
    bus_id integer,
    stop_name character varying(100) NOT NULL,
    stop_order integer NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    estimated_time_minutes integer DEFAULT 5,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.stops OWNER TO postgres;

--
-- Name: stops_backup_20261004; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stops_backup_20261004 (
    id integer,
    bus_id integer,
    stop_name character varying(100),
    stop_order integer,
    latitude numeric(10,8),
    longitude numeric(11,8),
    estimated_time_minutes integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.stops_backup_20261004 OWNER TO postgres;

--
-- Name: stops_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stops_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stops_id_seq OWNER TO postgres;

--
-- Name: stops_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stops_id_seq OWNED BY public.stops.id;


--
-- Name: student_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_events (
    id integer NOT NULL,
    student_id integer,
    bus_id integer,
    stop_id integer,
    trip_id integer,
    event_type character varying(20) NOT NULL,
    marked_by integer,
    parent_confirmed_at timestamp without time zone,
    parent_confirmed_by integer,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.student_events OWNER TO postgres;

--
-- Name: student_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_events_id_seq OWNER TO postgres;

--
-- Name: student_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_events_id_seq OWNED BY public.student_events.id;


--
-- Name: student_families; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_families (
    id integer NOT NULL,
    student_id integer,
    family_member_name character varying(100) NOT NULL,
    relationship character varying(50) NOT NULL,
    phone character varying(20),
    email character varying(100),
    address text,
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.student_families OWNER TO postgres;

--
-- Name: student_families_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_families_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_families_id_seq OWNER TO postgres;

--
-- Name: student_families_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_families_id_seq OWNED BY public.student_families.id;


--
-- Name: student_scans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_scans (
    id integer NOT NULL,
    student_id integer,
    bus_id integer,
    trip_id integer,
    driver_id integer,
    scan_type character varying(20) NOT NULL,
    scanned_at timestamp with time zone DEFAULT now(),
    latitude double precision,
    longitude double precision,
    verified boolean DEFAULT false,
    reject_reason text
);


ALTER TABLE public.student_scans OWNER TO postgres;

--
-- Name: student_scans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_scans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_scans_id_seq OWNER TO postgres;

--
-- Name: student_scans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_scans_id_seq OWNED BY public.student_scans.id;


--
-- Name: students; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.students (
    id integer NOT NULL,
    full_name character varying(100) NOT NULL,
    parent_id integer,
    bus_id integer,
    stop_id integer,
    totp_secret text NOT NULL,
    qr_code_url text,
    grade character varying(10),
    profile_image text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    school_name character varying(100),
    section character varying(20),
    student_id_number character varying(50),
    date_of_birth date,
    gender character varying(10),
    qr_token character varying(64),
    qr_token_expires timestamp with time zone,
    CONSTRAINT students_gender_check CHECK (((gender)::text = ANY ((ARRAY['male'::character varying, 'female'::character varying, 'other'::character varying])::text[])))
);


ALTER TABLE public.students OWNER TO postgres;

--
-- Name: students_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.students_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.students_id_seq OWNER TO postgres;

--
-- Name: students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.students_id_seq OWNED BY public.students.id;


--
-- Name: trip_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trip_logs (
    id integer NOT NULL,
    bus_id integer,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    speed numeric(5,2),
    heading numeric(5,2),
    recorded_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.trip_logs OWNER TO postgres;

--
-- Name: trip_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.trip_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trip_logs_id_seq OWNER TO postgres;

--
-- Name: trip_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.trip_logs_id_seq OWNED BY public.trip_logs.id;


--
-- Name: trip_progress; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trip_progress (
    id integer NOT NULL,
    bus_id integer,
    stop_id integer,
    passed_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.trip_progress OWNER TO postgres;

--
-- Name: trip_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.trip_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trip_progress_id_seq OWNER TO postgres;

--
-- Name: trip_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.trip_progress_id_seq OWNED BY public.trip_progress.id;


--
-- Name: trips; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trips (
    id integer NOT NULL,
    bus_id integer,
    driver_id integer,
    started_at timestamp without time zone DEFAULT now(),
    ended_at timestamp without time zone,
    status character varying(20) DEFAULT 'in_progress'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    distance_km numeric
);


ALTER TABLE public.trips OWNER TO postgres;

--
-- Name: trips_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.trips_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trips_id_seq OWNER TO postgres;

--
-- Name: trips_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.trips_id_seq OWNED BY public.trips.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    full_name character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password_hash text NOT NULL,
    phone character varying(20),
    role character varying(20) NOT NULL,
    profile_image text,
    fcm_token text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    address text,
    date_of_birth date,
    gender character varying(10),
    occupation character varying(100),
    emergency_contact character varying(20),
    relationship_to_student character varying(50),
    is_approved boolean DEFAULT false,
    approved_by integer,
    approved_at timestamp without time zone,
    badge_number character varying(50),
    station character varying(100),
    license_number character varying(50),
    experience integer,
    pending_student_name character varying(100),
    pending_student_grade character varying(20),
    pending_student_school character varying(100),
    pending_student_id_number character varying(50),
    assigned_bus_id integer,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'driver'::character varying, 'parent'::character varying, 'police'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: buses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.buses ALTER COLUMN id SET DEFAULT nextval('public.buses_id_seq'::regclass);


--
-- Name: daily_attendance id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_attendance ALTER COLUMN id SET DEFAULT nextval('public.daily_attendance_id_seq'::regclass);


--
-- Name: driver_registrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.driver_registrations ALTER COLUMN id SET DEFAULT nextval('public.driver_registrations_id_seq'::regclass);


--
-- Name: emergency_alerts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emergency_alerts ALTER COLUMN id SET DEFAULT nextval('public.emergency_alerts_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: parent_registrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parent_registrations ALTER COLUMN id SET DEFAULT nextval('public.parent_registrations_id_seq'::regclass);


--
-- Name: police_registrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.police_registrations ALTER COLUMN id SET DEFAULT nextval('public.police_registrations_id_seq'::regclass);


--
-- Name: stop_arrivals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stop_arrivals ALTER COLUMN id SET DEFAULT nextval('public.stop_arrivals_id_seq'::regclass);


--
-- Name: stops id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stops ALTER COLUMN id SET DEFAULT nextval('public.stops_id_seq'::regclass);


--
-- Name: student_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_events ALTER COLUMN id SET DEFAULT nextval('public.student_events_id_seq'::regclass);


--
-- Name: student_families id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_families ALTER COLUMN id SET DEFAULT nextval('public.student_families_id_seq'::regclass);


--
-- Name: student_scans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_scans ALTER COLUMN id SET DEFAULT nextval('public.student_scans_id_seq'::regclass);


--
-- Name: students id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students ALTER COLUMN id SET DEFAULT nextval('public.students_id_seq'::regclass);


--
-- Name: trip_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_logs ALTER COLUMN id SET DEFAULT nextval('public.trip_logs_id_seq'::regclass);


--
-- Name: trip_progress id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_progress ALTER COLUMN id SET DEFAULT nextval('public.trip_progress_id_seq'::regclass);


--
-- Name: trips id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trips ALTER COLUMN id SET DEFAULT nextval('public.trips_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: buses buses_bus_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.buses
    ADD CONSTRAINT buses_bus_number_key UNIQUE (bus_number);


--
-- Name: buses buses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.buses
    ADD CONSTRAINT buses_pkey PRIMARY KEY (id);


--
-- Name: buses buses_plate_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.buses
    ADD CONSTRAINT buses_plate_number_key UNIQUE (plate_number);


--
-- Name: daily_attendance daily_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_attendance
    ADD CONSTRAINT daily_attendance_pkey PRIMARY KEY (id);


--
-- Name: daily_attendance daily_attendance_student_id_boarded_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_attendance
    ADD CONSTRAINT daily_attendance_student_id_boarded_date_key UNIQUE (student_id, boarded_date);


--
-- Name: driver_registrations driver_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.driver_registrations
    ADD CONSTRAINT driver_registrations_pkey PRIMARY KEY (id);


--
-- Name: emergency_alerts emergency_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emergency_alerts
    ADD CONSTRAINT emergency_alerts_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: parent_registrations parent_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parent_registrations
    ADD CONSTRAINT parent_registrations_pkey PRIMARY KEY (id);


--
-- Name: police_registrations police_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.police_registrations
    ADD CONSTRAINT police_registrations_pkey PRIMARY KEY (id);


--
-- Name: stop_arrivals stop_arrivals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stop_arrivals
    ADD CONSTRAINT stop_arrivals_pkey PRIMARY KEY (id);


--
-- Name: stop_arrivals stop_arrivals_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stop_arrivals
    ADD CONSTRAINT stop_arrivals_unique UNIQUE (trip_id, stop_id, stage);


--
-- Name: stops stops_bus_id_stop_order_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stops
    ADD CONSTRAINT stops_bus_id_stop_order_key UNIQUE (bus_id, stop_order);


--
-- Name: stops stops_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stops
    ADD CONSTRAINT stops_pkey PRIMARY KEY (id);


--
-- Name: student_events student_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_events
    ADD CONSTRAINT student_events_pkey PRIMARY KEY (id);


--
-- Name: student_families student_families_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_families
    ADD CONSTRAINT student_families_pkey PRIMARY KEY (id);


--
-- Name: student_scans student_scans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_scans
    ADD CONSTRAINT student_scans_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: students students_qr_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_qr_token_key UNIQUE (qr_token);


--
-- Name: students students_student_id_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_student_id_number_key UNIQUE (student_id_number);


--
-- Name: trip_logs trip_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_logs
    ADD CONSTRAINT trip_logs_pkey PRIMARY KEY (id);


--
-- Name: trip_progress trip_progress_bus_id_stop_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_progress
    ADD CONSTRAINT trip_progress_bus_id_stop_id_key UNIQUE (bus_id, stop_id);


--
-- Name: trip_progress trip_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_progress
    ADD CONSTRAINT trip_progress_pkey PRIMARY KEY (id);


--
-- Name: trips trips_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_parent_registrations_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_parent_registrations_status ON public.parent_registrations USING btree (status);


--
-- Name: idx_parent_registrations_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_parent_registrations_user_id ON public.parent_registrations USING btree (user_id);


--
-- Name: idx_stop_arrivals_trip; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stop_arrivals_trip ON public.stop_arrivals USING btree (trip_id);


--
-- Name: idx_student_events_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_events_student ON public.student_events USING btree (student_id, created_at DESC);


--
-- Name: idx_student_events_trip; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_events_trip ON public.student_events USING btree (trip_id);


--
-- Name: idx_student_events_unconfirmed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_events_unconfirmed ON public.student_events USING btree (event_type, parent_confirmed_at) WHERE (((event_type)::text = 'dropped_off'::text) AND (parent_confirmed_at IS NULL));


--
-- Name: idx_student_scans_bus; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_scans_bus ON public.student_scans USING btree (bus_id, scanned_at DESC);


--
-- Name: idx_student_scans_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_scans_student ON public.student_scans USING btree (student_id, scanned_at DESC);


--
-- Name: idx_trips_bus_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trips_bus_id ON public.trips USING btree (bus_id);


--
-- Name: idx_trips_driver_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trips_driver_id ON public.trips USING btree (driver_id);


--
-- Name: idx_trips_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trips_status ON public.trips USING btree (status);


--
-- Name: idx_users_assigned_bus; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_assigned_bus ON public.users USING btree (assigned_bus_id) WHERE ((role)::text = 'police'::text);


--
-- Name: students trg_generate_student_qr; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_generate_student_qr BEFORE INSERT ON public.students FOR EACH ROW EXECUTE FUNCTION public.generate_student_qr();


--
-- Name: buses buses_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.buses
    ADD CONSTRAINT buses_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: daily_attendance daily_attendance_bus_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_attendance
    ADD CONSTRAINT daily_attendance_bus_id_fkey FOREIGN KEY (bus_id) REFERENCES public.buses(id) ON DELETE CASCADE;


--
-- Name: daily_attendance daily_attendance_checked_by_driver_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_attendance
    ADD CONSTRAINT daily_attendance_checked_by_driver_fkey FOREIGN KEY (checked_by_driver) REFERENCES public.users(id);


--
-- Name: daily_attendance daily_attendance_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_attendance
    ADD CONSTRAINT daily_attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: driver_registrations driver_registrations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.driver_registrations
    ADD CONSTRAINT driver_registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: driver_registrations driver_registrations_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.driver_registrations
    ADD CONSTRAINT driver_registrations_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id);


--
-- Name: emergency_alerts emergency_alerts_acknowledged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emergency_alerts
    ADD CONSTRAINT emergency_alerts_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES public.users(id);


--
-- Name: emergency_alerts emergency_alerts_bus_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emergency_alerts
    ADD CONSTRAINT emergency_alerts_bus_id_fkey FOREIGN KEY (bus_id) REFERENCES public.buses(id) ON DELETE CASCADE;


--
-- Name: emergency_alerts emergency_alerts_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emergency_alerts
    ADD CONSTRAINT emergency_alerts_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users(id);


--
-- Name: emergency_alerts emergency_alerts_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emergency_alerts
    ADD CONSTRAINT emergency_alerts_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id);


--
-- Name: emergency_alerts emergency_alerts_responded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emergency_alerts
    ADD CONSTRAINT emergency_alerts_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES public.users(id);


--
-- Name: notifications notifications_related_bus_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_related_bus_id_fkey FOREIGN KEY (related_bus_id) REFERENCES public.buses(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_related_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_related_student_id_fkey FOREIGN KEY (related_student_id) REFERENCES public.students(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (parent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: parent_registrations parent_registrations_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parent_registrations
    ADD CONSTRAINT parent_registrations_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: parent_registrations parent_registrations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parent_registrations
    ADD CONSTRAINT parent_registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: police_registrations police_registrations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.police_registrations
    ADD CONSTRAINT police_registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: police_registrations police_registrations_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.police_registrations
    ADD CONSTRAINT police_registrations_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id);


--
-- Name: stop_arrivals stop_arrivals_bus_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stop_arrivals
    ADD CONSTRAINT stop_arrivals_bus_id_fkey FOREIGN KEY (bus_id) REFERENCES public.buses(id) ON DELETE CASCADE;


--
-- Name: stop_arrivals stop_arrivals_stop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stop_arrivals
    ADD CONSTRAINT stop_arrivals_stop_id_fkey FOREIGN KEY (stop_id) REFERENCES public.stops(id) ON DELETE CASCADE;


--
-- Name: stop_arrivals stop_arrivals_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stop_arrivals
    ADD CONSTRAINT stop_arrivals_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: stops stops_bus_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stops
    ADD CONSTRAINT stops_bus_id_fkey FOREIGN KEY (bus_id) REFERENCES public.buses(id) ON DELETE CASCADE;


--
-- Name: student_events student_events_bus_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_events
    ADD CONSTRAINT student_events_bus_id_fkey FOREIGN KEY (bus_id) REFERENCES public.buses(id);


--
-- Name: student_events student_events_marked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_events
    ADD CONSTRAINT student_events_marked_by_fkey FOREIGN KEY (marked_by) REFERENCES public.users(id);


--
-- Name: student_events student_events_parent_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_events
    ADD CONSTRAINT student_events_parent_confirmed_by_fkey FOREIGN KEY (parent_confirmed_by) REFERENCES public.users(id);


--
-- Name: student_events student_events_stop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_events
    ADD CONSTRAINT student_events_stop_id_fkey FOREIGN KEY (stop_id) REFERENCES public.stops(id);


--
-- Name: student_events student_events_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_events
    ADD CONSTRAINT student_events_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_events student_events_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_events
    ADD CONSTRAINT student_events_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id);


--
-- Name: student_families student_families_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_families
    ADD CONSTRAINT student_families_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_scans student_scans_bus_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_scans
    ADD CONSTRAINT student_scans_bus_id_fkey FOREIGN KEY (bus_id) REFERENCES public.buses(id) ON DELETE SET NULL;


--
-- Name: student_scans student_scans_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_scans
    ADD CONSTRAINT student_scans_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: student_scans student_scans_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_scans
    ADD CONSTRAINT student_scans_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_scans student_scans_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_scans
    ADD CONSTRAINT student_scans_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE SET NULL;


--
-- Name: students students_bus_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_bus_id_fkey FOREIGN KEY (bus_id) REFERENCES public.buses(id) ON DELETE SET NULL;


--
-- Name: students students_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: students students_stop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_stop_id_fkey FOREIGN KEY (stop_id) REFERENCES public.stops(id) ON DELETE SET NULL;


--
-- Name: trip_logs trip_logs_bus_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_logs
    ADD CONSTRAINT trip_logs_bus_id_fkey FOREIGN KEY (bus_id) REFERENCES public.buses(id) ON DELETE CASCADE;


--
-- Name: trip_progress trip_progress_bus_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_progress
    ADD CONSTRAINT trip_progress_bus_id_fkey FOREIGN KEY (bus_id) REFERENCES public.buses(id) ON DELETE CASCADE;


--
-- Name: trip_progress trip_progress_stop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_progress
    ADD CONSTRAINT trip_progress_stop_id_fkey FOREIGN KEY (stop_id) REFERENCES public.stops(id) ON DELETE CASCADE;


--
-- Name: trips trips_bus_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_bus_id_fkey FOREIGN KEY (bus_id) REFERENCES public.buses(id) ON DELETE CASCADE;


--
-- Name: trips trips_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: users users_assigned_bus_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_assigned_bus_id_fkey FOREIGN KEY (assigned_bus_id) REFERENCES public.buses(id);


--
-- PostgreSQL database dump complete
--

\unrestrict kqGCAatovbB4AjvnysQfrAt8zdpgTcDrGA14PVmBaQbTV3LzN8wxFqQBH3Takuh

