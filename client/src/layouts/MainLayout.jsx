import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navigation";
import Footer from "../components/Footer";
import { useEffect } from "react";

const MainLayout = () => {
    const location = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [location]);

    return (
        <>
            <Navbar />
            <Outlet />
            <Footer />
        </>
    );
}

export default MainLayout;