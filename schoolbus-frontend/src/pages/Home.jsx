import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Bus, MapPin, Users, Shield, Bell, Menu, X, ArrowRight,
    Phone, Mail, Map, School, QrCode, CheckCircle,
    Award, Star, Smartphone, GraduationCap, BookOpen, Building2,
    Sparkles, Route, Globe, ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================
// TRANSLATIONS DICTIONARY — English, Amharic, Afaan Oromoo
// ============================================================
const TRANSLATIONS = {
    en: {
        schoolName: 'Bright Future',
        schoolTagline: 'School • Addis Ababa',
        navPrograms: 'Programs',
        navRoutes: 'Bus Routes',
        navHowItWorks: 'How It Works',
        navContact: 'Contact',
        signIn: 'Sign In',
        enroll: 'Enroll',
        dashboard: 'Dashboard',
        logout: 'Logout',
        heroBadge: 'Enrolling for 2026 — Seats available',
        heroTitle1: 'Bright Future',
        heroTitle2: 'School Addis Ababa',
        heroSubtitle: 'Nurturing young minds from KG to Grade 12 — with smart bus tracking so parents know exactly when their child is on the way.',
        enrollYourChild: 'Enroll Your Child',
        parentLogin: 'Parent Login',
        goToDashboard: 'Go to Dashboard',
        badgeKGto12: 'KG – Grade 12',
        badgeBusRoutes: '4 Bus Routes',
        badgeLiveTracking: 'Live Tracking',
        statStudents: 'Students',
        statBuses: 'Buses',
        statStops: 'Stops',
        mockBus: 'Bright Future Bus',
        mockStopProgress: 'Stop 2 of 3',
        mockArriving: 'Arriving in 4 min',
        mockBoarded: 'Student boarded safely',
        mockParentAlert: 'Parent Alert',
        mockTwoStopsAway: 'Bus is 2 stops away',
        statsEnrolled: 'Enrolled Students',
        statsActiveBuses: 'Active Buses',
        statsPickupStops: 'Pickup Stops',
        statsYears: 'Years of Excellence',
        programsTitle: 'Our Academic',
        programsTitleAccent: 'Programs',
        programsSubtitle: 'From Kindergarten through Grade 12, we nurture every stage of your child\'s growth.',
        programKG: 'Kindergarten',
        programPrimary: 'Primary School',
        programElementary: 'Elementary (2nd Cycle)',
        programHigh: 'High School',
        campusBole: 'Bole Central',
        campusGerji: 'Gerji',
        routesTitle: 'Our',
        routesTitleAccent: 'Bus Routes',
        routesSubtitle: '4 buses covering 4 directions of Addis Ababa. Each route has 3 strategic pickup stops.',
        routeBoleLocal: 'Bole Local',
        routeWest: 'West Corridor',
        routeNorth: 'North Corridor',
        routeEast: 'East Corridor',
        directionBole: 'Bole Area',
        directionWest: 'West',
        directionNorth: 'North',
        directionEast: 'East',
        directionLabel: 'Direction',
        pickupStops: 'Pickup Stops',
        notSureRoute: 'Not sure which bus your child takes?',
        contactOffice: 'Contact our office',
        stopBole: 'Bole',
        stopCMC: 'CMC',
        stopBoleMichael: 'Bole Michael',
        stopKera: 'Kera',
        stopSarbet: 'Sarbet',
        stopWolloSefer: 'Wollo Sefer',
        stopAratKilo: 'Arat Kilo',
        stopMegenagna: 'Megenagna',
        stopAyat: 'Ayat',
        stopSummit: 'Summit',
        stopGerji: 'Gerji',
        howTitle: 'How Parent',
        howTitleAccent: 'Bus Tracking Works',
        howSubtitle: 'Three simple steps to keep you informed about your child\'s daily commute.',
        step1Title: 'Register Online',
        step1Desc: 'Enroll your child and get your parent account set up in minutes.',
        step2Title: 'QR Check-in',
        step2Desc: 'Your child scans their QR card when boarding the bus — you get a notification instantly.',
        step3Title: 'Track Live',
        step3Desc: 'Follow the bus on the map and get alerts when it\'s 3, 2, or 1 stop away.',
        testTitle: 'What Bright Future',
        testTitleAccent: 'Parents Say',
        test1Name: 'Tigist W.',
        test1Role: 'Parent of 2 (Grades 3 & 5)',
        test1Quote: 'Bright Future\'s bus tracking changed my mornings. I know exactly when to leave the house — no more waiting outside in the cold.',
        test2Name: 'Abebe K.',
        test2Role: 'Parent of 1 (Grade 9)',
        test2Quote: 'The QR card system is genius. I get a notification the moment my son boards the bus at Gerji.',
        test3Name: 'Meron A.',
        test3Role: 'Parent of 3 (KG, Grade 2, Grade 6)',
        test3Quote: 'Three kids, three grades, one bus. Bright Future\'s system handles all of it beautifully.',
        ctaTitle: 'Ready to Enroll?',
        ctaSubtitle: 'Join 1,200+ families who trust Bright Future School for their child\'s education and daily commute.',
        ctaEnroll: 'Enroll Now',
        ctaSignIn: 'Sign In',
        footerTagline: 'Nurturing young minds from KG to Grade 12 with smart bus tracking.',
        footerQuickLinks: 'Quick Links',
        footerPortal: 'Portal',
        footerContact: 'Contact',
        footerLogin: 'Login',
        footerRegister: 'Register',
        footerAddress: 'Bole, Addis Ababa',
        footerCopyright: '© 2026 Bright Future School. All rights reserved.',
    },

    am: {
        schoolName: 'ብራይት ፊውቸር',
        schoolTagline: 'ትምህርት ቤት • አዲስ አበባ',
        navPrograms: 'ፕሮግራሞች',
        navRoutes: 'የአውቶቡስ መስመሮች',
        navHowItWorks: 'አሠራር',
        navContact: 'አግኙን',
        signIn: 'ግባ',
        enroll: 'ይመዝገቡ',
        dashboard: 'ዳሽቦርድ',
        logout: 'ውጣ',
        heroBadge: 'ለ2018 ዓ.ም ምዝገባ ተከፍቷል — ቦታ አለ',
        heroTitle1: 'ብራይት ፊውቸር',
        heroTitle2: 'ትምህርት ቤት አዲስ አበባ',
        heroSubtitle: 'ከመዋለ ሕጻናት እስከ 12ኛ ክፍል — ልጆቻቸው መቼ እንደሚደርሱ ወላጆች በትክክል እንዲያውቁ ዘመናዊ የአውቶቡስ መከታተያ ሥርዓት።',
        enrollYourChild: 'ልጅዎን ያስመዝግቡ',
        parentLogin: 'የወላጅ መግቢያ',
        goToDashboard: 'ወደ ዳሽቦርድ ሂድ',
        badgeKGto12: 'ከመዋለ ሕጻናት እስከ 12ኛ ክፍል',
        badgeBusRoutes: '4 የአውቶቡስ መስመሮች',
        badgeLiveTracking: 'ቀጥታ መከታተያ',
        statStudents: 'ተማሪዎች',
        statBuses: 'አውቶቡሶች',
        statStops: 'ማቆሚያዎች',
        mockBus: 'የብራይት ፊውቸር አውቶቡስ',
        mockStopProgress: 'ማቆሚያ 2 ከ 3',
        mockArriving: 'በ4 ደቂቃ ይደርሳል',
        mockBoarded: 'ተማሪው በደህና ገብቷል',
        mockParentAlert: 'የወላጅ ማሳወቂያ',
        mockTwoStopsAway: 'አውቶቡሱ 2 ማቆሚያ ይቀረዋል',
        statsEnrolled: 'የተመዘገቡ ተማሪዎች',
        statsActiveBuses: 'ንቁ አውቶቡሶች',
        statsPickupStops: 'የመውሰጃ ማቆሚያዎች',
        statsYears: 'የልህቀት ዓመታት',
        programsTitle: 'የትምህርት',
        programsTitleAccent: 'ፕሮግራሞቻችን',
        programsSubtitle: 'ከመዋለ ሕጻናት እስከ 12ኛ ክፍል የልጅዎን እድገት በሁሉም ደረጃ እናሳድጋለን።',
        programKG: 'መዋለ ሕጻናት',
        programPrimary: 'የመጀመሪያ ደረጃ',
        programElementary: 'ሁለተኛ ዑደት',
        programHigh: 'ሁለተኛ ደረጃ',
        campusBole: 'ቦሌ ዋና ግቢ',
        campusGerji: 'ገርጂ',
        routesTitle: 'የእኛ',
        routesTitleAccent: 'የአውቶቡስ መስመሮች',
        routesSubtitle: '4 አውቶቡሶች 4 የአዲስ አበባ አቅጣጫዎችን ይሸፍናሉ። እያንዳንዱ መስመር 3 ስትራቴጂያዊ ማቆሚያዎች አሉት።',
        routeBoleLocal: 'ቦሌ አካባቢ',
        routeWest: 'ምዕራብ መስመር',
        routeNorth: 'ሰሜን መስመር',
        routeEast: 'ምስራቅ መስመር',
        directionBole: 'ቦሌ',
        directionWest: 'ምዕራብ',
        directionNorth: 'ሰሜን',
        directionEast: 'ምስራቅ',
        directionLabel: 'አቅጣጫ',
        pickupStops: 'ማቆሚያዎች',
        notSureRoute: 'ልጅዎ የትኛውን አውቶቡስ እንደሚወስድ አያውቁም?',
        contactOffice: 'ቢሯችንን ያግኙ',
        stopBole: 'ቦሌ',
        stopCMC: 'ሲ.ኤም.ሲ',
        stopBoleMichael: 'ቦሌ ሚካኤል',
        stopKera: 'ቄራ',
        stopSarbet: 'ሳርቤት',
        stopWolloSefer: 'ወሎ ሰፈር',
        stopAratKilo: 'አራት ኪሎ',
        stopMegenagna: 'መገናኛ',
        stopAyat: 'አያት',
        stopSummit: 'ሰሚት',
        stopGerji: 'ገርጂ',
        howTitle: 'የወላጅ የአውቶቡስ',
        howTitleAccent: 'መከታተያ አሠራር',
        howSubtitle: 'የልጅዎን የዕለት ተዕለት ጉዞ ለማወቅ ሦስት ቀላል ደረጃዎች።',
        step1Title: 'በመስመር ላይ ይመዝገቡ',
        step1Desc: 'ልጅዎን ያስመዝግቡ እና የወላጅ መግቢያዎን በደቂቃዎች ያዘጋጁ።',
        step2Title: 'የQR ቼክ-ኢን',
        step2Desc: 'ልጅዎ አውቶቡስ ሲገባ የQR ካርዱን ይቃኛል — ወዲያውኑ ማሳወቂያ ይደርስዎታል።',
        step3Title: 'በቀጥታ ይከታተሉ',
        step3Desc: 'አውቶቡሱን በካርታ ላይ ይከታተሉ እና 3, 2, ወይም 1 ማቆሚያ ሲቀረው ማሳወቂያ ይቀበሉ።',
        testTitle: 'የብራይት ፊውቸር',
        testTitleAccent: 'ወላጆች ምን ይላሉ',
        test1Name: 'ትዕግስት ወ.',
        test1Role: 'የ2 ልጆች ወላጅ (3ኛ እና 5ኛ ክፍል)',
        test1Quote: 'የብራይት ፊውቸር የአውቶቡስ መከታተያ ጠዋቴን ቀይሮታል። ቤቴን መቼ መልቀቅ እንዳለብኝ በትክክል አውቃለሁ — በቅዝቃዜ ውስጥ መጠበቅ ቀርቷል።',
        test2Name: 'አበበ ኬ.',
        test2Role: 'የ1 ልጅ ወላጅ (9ኛ ክፍል)',
        test2Quote: 'የQR ካርድ ሥርዓቱ ጎበዝ ነው። ልጄ ገርጂ ላይ አውቶቡስ ሲገባ ወዲያውኑ ማሳወቂያ ይደርሰኛል።',
        test3Name: 'መረን አ.',
        test3Role: 'የ3 ልጆች ወላጅ (መዋለ ሕጻናት፣ 2ኛ እና 6ኛ ክፍል)',
        test3Quote: 'ሦስት ልጆች፣ ሦስት ክፍሎች፣ አንድ አውቶቡስ። የብራይት ፊውቸር ሥርዓት ሁሉንም በሚገባ ያስተዳድራል።',
        ctaTitle: 'ለመመዝገብ ተዘጋጅተዋል?',
        ctaSubtitle: 'ልጆቻቸውን ለትምህርትና ለዕለታዊ ጉዞ ለብራይት ፊውቸር ትምህርት ቤት የሚያምኑ 1,200+ ቤተሰቦችን ይቀላቀሉ።',
        ctaEnroll: 'አሁን ይመዝገቡ',
        ctaSignIn: 'ግባ',
        footerTagline: 'ከመዋለ ሕጻናት እስከ 12ኛ ክፍል ዘመናዊ ትምህርት።',
        footerQuickLinks: 'ፈጣን አገናኞች',
        footerPortal: 'ፖርታል',
        footerContact: 'አግኙን',
        footerLogin: 'ግባ',
        footerRegister: 'ይመዝገቡ',
        footerAddress: 'ቦሌ፣ አዲስ አበባ',
        footerCopyright: '© 2026 ብራይት ፍውቸር ትምህርት ቤት። መብቱ በሕግ የተጠበቀ ነው።',
    },

    om: {
        schoolName: 'Bright Future',
        schoolTagline: 'Mana Barumsaa • Finfinnee',
        navPrograms: 'Sagantaalee',
        navRoutes: 'Daandii Awtoobisii',
        navHowItWorks: 'Akkamitti Hojjeta',
        navContact: 'Nu Qunnamaa',
        signIn: 'Seeni',
        enroll: 'Galmaa\'i',
        dashboard: 'Daashboordii',
        logout: 'Ba\'i',
        heroBadge: 'Bara 2026 galmee banaa jira — bakki jira',
        heroTitle1: 'Bright Future',
        heroTitle2: 'Mana Barumsaa Finfinnee',
        heroSubtitle: 'Ijaarsa daa\'immanii mana barumsaa irraa hanga kutaa 12ffaa — sirna hordoffii awtoobisii ammayyaa waliin, warri gaafatan yeroo ijoolleen isaanii dhufu sirriitti akka beekan.',
        enrollYourChild: 'Daa\'ima Keessan Galmeessaa',
        parentLogin: 'Seensa Maatii',
        goToDashboard: 'Gara Daashboordii Deemi',
        badgeKGto12: 'Mana Barumsaa irraa hanga Kutaa 12ffaa',
        badgeBusRoutes: 'Daandii Awtoobisii 4',
        badgeLiveTracking: 'Hordoffii Kallattii',
        statStudents: 'Barattoota',
        statBuses: 'Awtoobisoota',
        statStops: 'Iddoo Dhaabbataa',
        mockBus: 'Awtoobisii Bright Future',
        mockStopProgress: 'Iddoo Dhaabbataa 2 keessaa 3',
        mockArriving: 'Daqiiqaa 4 keessatti dhufa',
        mockBoarded: 'Barataan nagaan seenee jira',
        mockParentAlert: 'Akeekkachiisa Maatii',
        mockTwoStopsAway: 'Awtoobisiin iddoo dhaabbataa 2 fagaata',
        statsEnrolled: 'Barattoota Galmaa\'an',
        statsActiveBuses: 'Awtoobisoota Socho\'an',
        statsPickupStops: 'Iddoo Fudhannaa',
        statsYears: 'Waggoota Ciminaa',
        programsTitle: 'Sagantaa',
        programsTitleAccent: 'Barnootaa Keenya',
        programsSubtitle: 'Mana barumsaa irraa hanga kutaa 12ffaa, sadarkaa guddina daa\'ima keessanii hunda ni guddisna.',
        programKG: 'Mana Barumsaa Daa\'immanii',
        programPrimary: 'Sadarkaa 1ffaa',
        programElementary: 'Sadarkaa 2ffaa',
        programHigh: 'Sadarkaa Lammaffaa',
        campusBole: 'Boolee Guddaa',
        campusGerji: 'Garijii',
        routesTitle: 'Daandii',
        routesTitleAccent: 'Awtoobisii Keenya',
        routesSubtitle: 'Awtoobisoonni 4 kallattiiwwan 4 Finfinnee ni hordofu. Daandiin tokko tokko iddoo dhaabbataa 3 qaba.',
        routeBoleLocal: 'Boolee Naannoo',
        routeWest: 'Daandii Dhihaa',
        routeNorth: 'Daandii Kaabaa',
        routeEast: 'Daandii Bahaa',
        directionBole: 'Naannoo Boolee',
        directionWest: 'Dhihaa',
        directionNorth: 'Kaabaa',
        directionEast: 'Bahaa',
        directionLabel: 'Kallattii',
        pickupStops: 'Iddoo Dhaabbataa',
        notSureRoute: 'Awtoobisii daa\'imni keessan fudhatu hin beektanii?',
        contactOffice: 'Waajjira keenya qunnamaa',
        stopBole: 'Boolee',
        stopCMC: 'CMC',
        stopBoleMichael: 'Boolee Miikaa\'el',
        stopKera: 'Qeraa',
        stopSarbet: 'Saarbee',
        stopWolloSefer: 'Walloo Sefer',
        stopAratKilo: 'Arat Kiloo',
        stopMegenagna: 'Magaalaa Guddicha',
        stopAyat: 'Ayaat',
        stopSummit: 'Summit',
        stopGerji: 'Garijii',
        howTitle: 'Akkamitti Warri Gaafatan',
        howTitleAccent: 'Hordoffii Awtoobisii Hojjeta',
        howSubtitle: 'Tarkaanfii salphaa sadii, imala guyyaa guyyaa daa\'ima keessanii akka beektan.',
        step1Title: 'Toora Interneetii irratti Galmaa\'i',
        step1Desc: 'Daa\'ima keessan galmeessaa, herrega maatii keessan daqiiqaa muraasa keessatti qopheessaa.',
        step2Title: 'QR Check-in',
        step2Desc: 'Daa\'imni keessan awtoobisii seenuun kaardii QR isaanii iskaanii — battalumatti akeekkachiisa argattu.',
        step3Title: 'Kallattiin Hordofi',
        step3Desc: 'Awtoobisii kaartaa irratti hordofaa, iddoo dhaabbataa 3, 2, yookaan 1 fagaatu akeekkachiisa argattuu.',
        testTitle: 'Maatii Bright Future',
        testTitleAccent: 'Maal Jedhu',
        test1Name: 'Tiigist W.',
        test1Role: 'Maatii ijoollee 2 (Kutaa 3 & 5)',
        test1Quote: 'Hordoffiin awtoobisii Bright Future ganama koo jijjiireera. Yeroo mana keessanii ba\'uu qabu sirriitti beeka — qorraa keessatti eeguun dhaabbateera.',
        test2Name: 'Abbabee K.',
        test2Role: 'Maatii ijoollee 1 (Kutaa 9)',
        test2Quote: 'Sirni kaardii QR baay\'ee gaarii dha. Ilmi koo Garijii irratti awtoobisii seenuun battalumatti akeekkachiisa na argata.',
        test3Name: 'Maroon A.',
        test3Role: 'Maatii ijoollee 3 (Mana Barumsaa, Kutaa 2, Kutaa 6)',
        test3Quote: 'Ijoollee sadii, kutaa sadii, awtoobisii tokko. Sirni Bright Future hunda gaarii hojjeta.',
        ctaTitle: 'Galmaa\'uuf Qophii Dha?',
        ctaSubtitle: 'Maatiiwwan 1,200+ ijoollee isaanii barnootaafi imala guyyaa guyyaa Bright Future irratti amananitti dabalaa.',
        ctaEnroll: 'Amma Galmaa\'i',
        ctaSignIn: 'Seeni',
        footerTagline: 'Ijaarsa daa\'immanii mana barumsaa irraa hanga kutaa 12ffaa barnoota ammayyaa.',
        footerQuickLinks: 'Hidhaalee Saffisaa',
        footerPortal: 'Poortaala',
        footerContact: 'Nu Qunnamaa',
        footerLogin: 'Seeni',
        footerRegister: 'Galmaa\'i',
        footerAddress: 'Boolee, Finfinnee',
        footerCopyright: '© 2026 Bright Future School. Mirgi seeraan eegameera.',
    },
};

const Home = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [langDropdownOpen, setLangDropdownOpen] = useState(false);

    const [language, setLanguage] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('brightfuture_lang') || 'en';
        }
        return 'en';
    });

    const t = TRANSLATIONS[language] || TRANSLATIONS.en;

    useEffect(() => {
        localStorage.setItem('brightfuture_lang', language);
        document.documentElement.lang = language === 'am' ? 'am' : language === 'om' ? 'om' : 'en';
    }, [language]);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.lang-dropdown')) {
                setLangDropdownOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const scrollToSection = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        setMobileMenuOpen(false);
    };

    const handleLogout = () => {
        logout();
        window.location.href = '/';
    };

    const busRoutes = [
        {
            bus: 'BUS-001',
            name: t.routeBoleLocal,
            direction: t.directionBole,
            color: 'from-blue-500 to-indigo-600',
            stops: [t.stopBole, t.stopCMC, t.stopBoleMichael],
        },
        {
            bus: 'BUS-002',
            name: t.routeWest,
            direction: t.directionWest,
            color: 'from-green-500 to-emerald-600',
            stops: [t.stopKera, t.stopSarbet, t.stopWolloSefer],
        },
        {
            bus: 'BUS-003',
            name: t.routeNorth,
            direction: t.directionNorth,
            color: 'from-yellow-500 to-amber-600',
            stops: [t.stopAratKilo, t.stopMegenagna, t.stopCMC],
        },
        {
            bus: 'BUS-004',
            name: t.routeEast,
            direction: t.directionEast,
            color: 'from-purple-500 to-pink-600',
            stops: [t.stopAyat, t.stopSummit, t.stopGerji],
        },
    ];

    const programs = [
        {
            icon: BookOpen,
            title: t.programKG,
            grades: 'KG 1 – KG 3',
            campus: t.campusBole,
            color: 'from-pink-500 to-rose-600',
        },
        {
            icon: GraduationCap,
            title: t.programPrimary,
            grades: 'Grades 1 – 4',
            campus: t.campusBole,
            color: 'from-blue-500 to-indigo-600',
        },
        {
            icon: School,
            title: t.programElementary,
            grades: 'Grades 5 – 8',
            campus: t.campusBole,
            color: 'from-green-500 to-emerald-600',
        },
        {
            icon: Award,
            title: t.programHigh,
            grades: 'Grades 9 – 12',
            campus: t.campusGerji,
            color: 'from-purple-500 to-indigo-600',
        },
    ];

    const LanguageDropdown = ({ variant = 'desktop' }) => {
        const isMobile = variant === 'mobile';

        return (
            <div className="relative lang-dropdown">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setLangDropdownOpen(!langDropdownOpen);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
                        isMobile
                            ? 'w-full justify-between text-gray-700 hover:bg-gray-50 border border-gray-200'
                            : scrolled
                                ? 'text-gray-700 hover:bg-gray-100 border border-gray-200'
                                : 'text-white/90 hover:bg-white/10 border border-white/30'
                    }`}
                >
                    <span className="flex items-center gap-1.5">
                        <Globe size={16} />
                        <span>
                            {language === 'am' ? 'አማርኛ' : language === 'om' ? 'Afaan Oromoo' : 'English'}
                        </span>
                    </span>
                    <ChevronDown
                        size={14}
                        className={`transition-transform ${langDropdownOpen ? 'rotate-180' : ''}`}
                    />
                </button>

                <AnimatePresence>
                    {langDropdownOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.15 }}
                            className={`${
                                isMobile
                                    ? 'absolute left-0 right-0 top-full mt-1'
                                    : 'absolute right-0 top-full mt-2 w-52'
                            } bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50`}
                        >
                            <button
                                onClick={() => {
                                    setLanguage('en');
                                    setLangDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-emerald-50 transition ${
                                    language === 'en' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700'
                                }`}
                            >
                                <span className="flex items-center gap-2">🇬🇧 English</span>
                                {language === 'en' && <CheckCircle size={14} className="text-emerald-600" />}
                            </button>
                            <button
                                onClick={() => {
                                    setLanguage('am');
                                    setLangDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-emerald-50 transition border-t border-gray-100 ${
                                    language === 'am' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700'
                                }`}
                            >
                                <span className="flex items-center gap-2">🇪🇹 አማርኛ</span>
                                {language === 'am' && <CheckCircle size={14} className="text-emerald-600" />}
                            </button>
                            <button
                                onClick={() => {
                                    setLanguage('om');
                                    setLangDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-emerald-50 transition border-t border-gray-100 ${
                                    language === 'om' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700'
                                }`}
                            >
                                <span className="flex items-center gap-2">🇪🇹 Afaan Oromoo</span>
                                {language === 'om' && <CheckCircle size={14} className="text-emerald-600" />}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-white">
            {/* ========== HEADER ========== */}
            <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                scrolled
                    ? 'bg-white/90 backdrop-blur-xl shadow-lg border-b border-gray-200/50'
                    : 'bg-transparent'
            }`}>
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 md:h-20">
                        <Link to="/" className="flex items-center gap-2 group">
                            <div className={`rounded-xl p-2 transition-all duration-300 ${
                                scrolled
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg shadow-emerald-500/25'
                                    : 'bg-white/20 backdrop-blur-sm border border-white/30'
                            }`}>
                                <GraduationCap size={24} className="text-white" />
                            </div>
                            <div className="flex flex-col leading-tight">
                                <span className={`text-base font-bold transition-colors ${
                                    scrolled ? 'text-gray-800' : 'text-white'
                                }`}>
                                    {t.schoolName}
                                </span>
                                <span className={`text-xs transition-colors ${
                                    scrolled ? 'text-emerald-600' : 'text-emerald-300'
                                }`}>
                                    {t.schoolTagline}
                                </span>
                            </div>
                        </Link>

                        <nav className="hidden md:flex items-center gap-8">
                            <button onClick={() => scrollToSection('programs')} className={`text-sm font-medium transition ${
                                scrolled ? 'text-gray-600 hover:text-emerald-600' : 'text-white/80 hover:text-white'
                            }`}>
                                {t.navPrograms}
                            </button>
                            <button onClick={() => scrollToSection('routes')} className={`text-sm font-medium transition ${
                                scrolled ? 'text-gray-600 hover:text-emerald-600' : 'text-white/80 hover:text-white'
                            }`}>
                                {t.navRoutes}
                            </button>
                            <button onClick={() => scrollToSection('how-it-works')} className={`text-sm font-medium transition ${
                                scrolled ? 'text-gray-600 hover:text-emerald-600' : 'text-white/80 hover:text-white'
                            }`}>
                                {t.navHowItWorks}
                            </button>
                            <button onClick={() => scrollToSection('contact')} className={`text-sm font-medium transition ${
                                scrolled ? 'text-gray-600 hover:text-emerald-600' : 'text-white/80 hover:text-white'
                            }`}>
                                {t.navContact}
                            </button>
                        </nav>

                        <div className="hidden md:flex items-center gap-3">
                            <LanguageDropdown variant="desktop" />

                            {isAuthenticated ? (
                                <>
                                    <Link
                                        to={`/${user?.role || 'dashboard'}`}
                                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all hover:scale-105 text-sm font-medium"
                                    >
                                        {t.dashboard}
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition text-sm font-medium"
                                    >
                                        {t.logout}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        to="/login"
                                        className={`px-4 py-2 rounded-xl transition text-sm font-medium ${
                                            scrolled ? 'text-gray-700 hover:text-emerald-600' : 'text-white/80 hover:text-white'
                                        }`}
                                    >
                                        {t.signIn}
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all hover:scale-105 text-sm font-medium"
                                    >
                                        {t.enroll}
                                    </Link>
                                </>
                            )}
                        </div>

                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className={`md:hidden p-2 rounded-xl transition ${
                                scrolled ? 'hover:bg-gray-100/70 text-gray-700' : 'hover:bg-white/10 text-white'
                            }`}
                        >
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="md:hidden bg-white/95 backdrop-blur-xl border-b border-gray-200 p-4 shadow-lg"
                    >
                        <nav className="flex flex-col gap-3">
                            <button onClick={() => scrollToSection('programs')} className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition px-3 py-2 rounded-xl hover:bg-gray-50 text-left">
                                {t.navPrograms}
                            </button>
                            <button onClick={() => scrollToSection('routes')} className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition px-3 py-2 rounded-xl hover:bg-gray-50 text-left">
                                {t.navRoutes}
                            </button>
                            <button onClick={() => scrollToSection('how-it-works')} className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition px-3 py-2 rounded-xl hover:bg-gray-50 text-left">
                                {t.navHowItWorks}
                            </button>
                            <button onClick={() => scrollToSection('contact')} className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition px-3 py-2 rounded-xl hover:bg-gray-50 text-left">
                                {t.navContact}
                            </button>

                            <div className="border-t border-gray-200 pt-3 flex flex-col gap-2">
                                <LanguageDropdown variant="mobile" />

                                {isAuthenticated ? (
                                    <>
                                        <Link
                                            to={`/${user?.role || 'dashboard'}`}
                                            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-medium text-center"
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            {t.dashboard}
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-medium"
                                        >
                                            {t.logout}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link
                                            to="/login"
                                            className="px-4 py-2 text-gray-700 hover:text-emerald-600 transition text-sm font-medium text-center border border-gray-200 rounded-xl"
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            {t.signIn}
                                        </Link>
                                        <Link
                                            to="/register"
                                            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-medium text-center"
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            {t.enroll}
                                        </Link>
                                    </>
                                )}
                            </div>
                        </nav>
                    </motion.div>
                )}
            </header>

            {/* ========== HERO ========== */}
            <section className="relative min-h-screen flex items-center overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
                    style={{ backgroundImage: 'url("/take-me-to-work-day.jpg")' }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/85 via-teal-900/65 to-blue-900/50"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/40"></div>
                </div>

                <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-pulse"></div>

                <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-32">
                    <div className="grid items-center gap-12 lg:grid-cols-2">
                        <motion.div
                            initial={{ opacity: 0, x: -40 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                            className="space-y-6"
                        >
                            <div className="inline-flex items-center gap-2 bg-emerald-500/20 backdrop-blur-sm text-emerald-200 px-4 py-2 rounded-full text-sm font-medium border border-emerald-400/30">
                                <Sparkles size={14} />
                                {t.heroBadge}
                            </div>

                            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                                {t.heroTitle1}
                                <span className="block text-transparent bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text">
                                    {t.heroTitle2}
                                </span>
                            </h1>

                            <p className="text-lg text-gray-100 max-w-lg">
                                {t.heroSubtitle}
                            </p>

                            <div className="flex flex-wrap gap-4">
                                {!isAuthenticated ? (
                                    <>
                                        <Link
                                            to="/register"
                                            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/40 transition-all hover:scale-105 font-medium flex items-center gap-2"
                                        >
                                            {t.enrollYourChild} <ArrowRight size={18} />
                                        </Link>
                                        <Link
                                            to="/login"
                                            className="px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl border border-white/30 hover:bg-white/20 transition font-medium"
                                        >
                                            {t.parentLogin}
                                        </Link>
                                    </>
                                ) : (
                                    <Link
                                        to={`/${user?.role || 'dashboard'}`}
                                        className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/40 transition-all hover:scale-105 font-medium flex items-center gap-2"
                                    >
                                        {t.goToDashboard} <ArrowRight size={18} />
                                    </Link>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-6 pt-4 text-sm text-gray-200">
                                <span className="flex items-center gap-1">
                                    <CheckCircle size={16} className="text-emerald-400" />
                                    {t.badgeKGto12}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Shield size={16} className="text-blue-400" />
                                    {t.badgeBusRoutes}
                                </span>
                                <span className="flex items-center gap-1">
                                    <MapPin size={16} className="text-yellow-400" />
                                    {t.badgeLiveTracking}
                                </span>
                            </div>

                            <div className="flex gap-8 pt-6">
                                <div>
                                    <p className="text-3xl font-bold text-white">1,200+</p>
                                    <p className="text-sm text-gray-300">{t.statStudents}</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-white">4</p>
                                    <p className="text-sm text-gray-300">{t.statBuses}</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-white">12</p>
                                    <p className="text-sm text-gray-300">{t.statStops}</p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="relative flex justify-center lg:justify-end"
                        >
                            <div className="relative w-full max-w-md space-y-4">
                                <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 shadow-2xl">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                                            <Bus size={24} className="text-white" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white">{t.mockBus}</p>
                                            <p className="text-sm text-gray-300">BUS-001 • {t.routeBoleLocal}</p>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-4 mb-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-300">{t.mockStopProgress}</span>
                                            <span className="text-emerald-400 flex items-center gap-1">
                                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                                                {t.mockArriving}
                                            </span>
                                        </div>
                                        <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: '65%' }}></div>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                                            <span>{t.stopBole}</span>
                                            <span className="text-emerald-400 font-medium">{t.stopCMC}</span>
                                            <span>{t.stopBoleMichael}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
                                        <CheckCircle size={18} className="text-emerald-400" />
                                        <span className="text-sm text-emerald-200">{t.mockBoarded}</span>
                                    </div>
                                </div>

                                <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 shadow-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                                            <Bell size={18} className="text-yellow-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">{t.mockParentAlert}</p>
                                            <p className="text-xs text-gray-300">{t.mockTwoStopsAway}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ========== STATS ========== */}
            <section className="relative py-16 bg-white/50 backdrop-blur-sm border-y border-gray-200/50">
                <div className="container mx-auto max-w-6xl px-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="grid grid-cols-2 gap-6 md:grid-cols-4"
                    >
                        {[
                            { icon: Users, label: t.statsEnrolled, value: '1,200+' },
                            { icon: Bus, label: t.statsActiveBuses, value: '4' },
                            { icon: Route, label: t.statsPickupStops, value: '12' },
                            { icon: Award, label: t.statsYears, value: '15+' },
                        ].map((stat, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                viewport={{ once: true }}
                                className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/50 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                            >
                                <stat.icon className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                                <p className="text-sm text-gray-500">{stat.label}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ========== PROGRAMS ========== */}
            <section id="programs" className="py-16 px-4 bg-gradient-to-b from-white to-emerald-50/30">
                <div className="container mx-auto max-w-6xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl font-bold text-gray-800 sm:text-4xl">
                            {t.programsTitle}
                            <span className="block text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text">
                                {t.programsTitleAccent}
                            </span>
                        </h2>
                        <p className="text-gray-500 mt-3 max-w-2xl mx-auto">
                            {t.programsSubtitle}
                        </p>
                    </motion.div>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {programs.map((program, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                viewport={{ once: true }}
                                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] group"
                            >
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${program.color} flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4 group-hover:scale-110 transition-transform`}>
                                    <program.icon size={28} className="text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800">{program.title}</h3>
                                <p className="text-sm text-gray-500 mt-1">{program.grades}</p>
                                <div className="flex items-center gap-1 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                                    <Building2 size={12} />
                                    {program.campus}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ========== BUS ROUTES ========== */}
            <section id="routes" className="py-16 px-4 bg-slate-50">
                <div className="container mx-auto max-w-6xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl font-bold text-gray-800 sm:text-4xl">
                            {t.routesTitle}
                            <span className="text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text"> {t.routesTitleAccent}</span>
                        </h2>
                        <p className="text-gray-500 mt-3 max-w-2xl mx-auto">
                            {t.routesSubtitle}
                        </p>
                    </motion.div>

                    <div className="grid gap-6 sm:grid-cols-2">
                        {busRoutes.map((route, index) => (
                            <motion.div
                                key={route.bus}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                viewport={{ once: true }}
                                className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden hover:shadow-xl transition-all hover:scale-[1.01]"
                            >
                                <div className={`bg-gradient-to-r ${route.color} p-5 text-white`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                                <Bus size={22} />
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase tracking-wider opacity-80">
                                                    {route.bus}
                                                </p>
                                                <p className="font-bold text-lg">{route.name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs uppercase tracking-wider opacity-80">{t.directionLabel}</p>
                                            <p className="font-medium">{route.direction}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5">
                                    <p className="text-xs uppercase tracking-wider text-gray-400 mb-3 font-semibold">
                                        {t.pickupStops} ({route.stops.length})
                                    </p>
                                    <div className="space-y-3">
                                        {route.stops.map((stop, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <div className="relative flex-shrink-0">
                                                    <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${route.color} flex items-center justify-center text-white text-sm font-bold shadow-md`}>
                                                        {i + 1}
                                                    </div>
                                                    {i < route.stops.length - 1 && (
                                                        <div className="absolute left-1/2 top-8 w-0.5 h-4 bg-gray-200 transform -translate-x-1/2"></div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-800">{stop}</p>
                                                </div>
                                                <MapPin size={16} className="text-gray-300" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        viewport={{ once: true }}
                        className="mt-8 text-center"
                    >
                        <p className="text-sm text-gray-500">
                            {t.notSureRoute}{' '}
                            <a href="#contact" className="text-emerald-600 font-medium hover:underline">
                                {t.contactOffice} →
                            </a>
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* ========== HOW IT WORKS ========== */}
            <section id="how-it-works" className="py-16 px-4 bg-white">
                <div className="container mx-auto max-w-6xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl font-bold text-gray-800 sm:text-4xl">
                            {t.howTitle}
                            <span className="block text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text">
                                {t.howTitleAccent}
                            </span>
                        </h2>
                        <p className="text-gray-500 mt-3 max-w-2xl mx-auto">
                            {t.howSubtitle}
                        </p>
                    </motion.div>

                    <div className="grid gap-8 md:grid-cols-3">
                        {[
                            { step: '01', icon: Smartphone, title: t.step1Title, description: t.step1Desc, color: 'from-emerald-500 to-teal-600' },
                            { step: '02', icon: QrCode, title: t.step2Title, description: t.step2Desc, color: 'from-blue-500 to-indigo-600' },
                            { step: '03', icon: Map, title: t.step3Title, description: t.step3Desc, color: 'from-yellow-500 to-amber-600' },
                        ].map((item, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                viewport={{ once: true }}
                                className="relative group"
                            >
                                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-8 border border-emerald-100 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] h-full flex flex-col">
                                    <div className="absolute top-4 right-4 text-5xl font-bold text-emerald-100 group-hover:text-emerald-200 transition">
                                        {item.step}
                                    </div>
                                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${item.color} flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4`}>
                                        <item.icon size={32} className="text-white" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-800 mb-2">{item.title}</h3>
                                    <p className="text-sm text-gray-600 flex-1">{item.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ========== TESTIMONIALS ========== */}
            <section className="py-16 px-4 bg-emerald-50/30">
                <div className="container mx-auto max-w-6xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl font-bold text-gray-800 sm:text-4xl">
                            {t.testTitle}
                            <span className="block text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text">
                                {t.testTitleAccent}
                            </span>
                        </h2>
                    </motion.div>

                    <div className="grid gap-6 md:grid-cols-3">
                        {[
                            { name: t.test1Name, role: t.test1Role, quote: t.test1Quote, avatar: 'https://i.pravatar.cc/100?img=1' },
                            { name: t.test2Name, role: t.test2Role, quote: t.test2Quote, avatar: 'https://i.pravatar.cc/100?img=2' },
                            { name: t.test3Name, role: t.test3Role, quote: t.test3Quote, avatar: 'https://i.pravatar.cc/100?img=3' },
                        ].map((testimonial, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                viewport={{ once: true }}
                                className="bg-white backdrop-blur-sm rounded-2xl p-6 border border-white shadow-lg hover:shadow-xl transition-all"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <img src={testimonial.avatar} alt={testimonial.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-200" />
                                    <div>
                                        <p className="font-semibold text-gray-800">{testimonial.name}</p>
                                        <p className="text-sm text-gray-500">{testimonial.role}</p>
                                    </div>
                                </div>
                                <div className="flex text-yellow-400 mb-2">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={16} fill="currentColor" />
                                    ))}
                                </div>
                                <p className="text-sm text-gray-600 italic">"{testimonial.quote}"</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ========== CTA ========== */}
            <section className="py-16 px-4">
                <div className="container mx-auto max-w-4xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-blue-700 p-8 sm:p-12 text-center text-white shadow-2xl shadow-emerald-500/25"
                    >
                        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-white/5 blur-2xl"></div>
                        <div className="relative z-10">
                            <GraduationCap size={56} className="mx-auto mb-4 opacity-90" />
                            <h2 className="text-3xl font-bold sm:text-4xl">{t.ctaTitle}</h2>
                            <p className="text-emerald-100 mt-2 max-w-lg mx-auto">
                                {t.ctaSubtitle}
                            </p>
                            <div className="mt-6 flex flex-wrap justify-center gap-4">
                                {!isAuthenticated ? (
                                    <>
                                        <Link
                                            to="/register"
                                            className="px-6 py-3 bg-white text-emerald-700 rounded-xl hover:shadow-lg hover:shadow-white/30 transition-all hover:scale-105 font-medium flex items-center gap-2"
                                        >
                                            {t.ctaEnroll} <ArrowRight size={18} />
                                        </Link>
                                        <Link
                                            to="/login"
                                            className="px-6 py-3 bg-white/20 text-white rounded-xl border border-white/30 hover:bg-white/30 transition font-medium"
                                        >
                                            {t.ctaSignIn}
                                        </Link>
                                    </>
                                ) : (
                                    <Link
                                        to={`/${user?.role || 'dashboard'}`}
                                        className="px-6 py-3 bg-white text-emerald-700 rounded-xl hover:shadow-lg hover:shadow-white/30 transition-all hover:scale-105 font-medium flex items-center gap-2"
                                    >
                                        {t.goToDashboard} <ArrowRight size={18} />
                                    </Link>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ========== CONTACT + FOOTER ========== */}
            <footer id="contact" className="bg-gray-900 text-white px-4 py-12">
                <div className="container mx-auto max-w-6xl">
                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <GraduationCap size={24} className="text-emerald-400" />
                                <div className="flex flex-col leading-tight">
                                    <span className="text-lg font-bold">{t.schoolName}</span>
                                    <span className="text-xs text-emerald-400">{t.schoolTagline}</span>
                                </div>
                            </div>
                            <p className="text-sm text-gray-400">
                                {t.footerTagline}
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">{t.footerQuickLinks}</h4>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li><button onClick={() => scrollToSection('programs')} className="hover:text-white transition">{t.navPrograms}</button></li>
                                <li><button onClick={() => scrollToSection('routes')} className="hover:text-white transition">{t.navRoutes}</button></li>
                                <li><button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition">{t.navHowItWorks}</button></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">{t.footerPortal}</h4>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li><Link to="/login" className="hover:text-white transition">{t.footerLogin}</Link></li>
                                <li><Link to="/register" className="hover:text-white transition">{t.footerRegister}</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">{t.footerContact}</h4>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li className="flex items-center gap-2"><Mail size={16} /> info@brightfutureschool.et</li>
                                <li className="flex items-center gap-2"><Phone size={16} /> +251-11-XXX-XXXX</li>
                                <li className="flex items-center gap-2"><MapPin size={16} /> {t.footerAddress}</li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
                        {t.footerCopyright}
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;