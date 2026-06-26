import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import EnquiryForm from "./pages/EnquiryForm";
import WorkflowScreen from "./pages/WorkflowScreen";
import SalesDashboard from "./pages/SalesDashboard";
import DetailPage from "./pages/DetailPage";
import ProductPersonalizationManager from "./pages/ProductPersonalizationManager";
import DesignApprovalTracker from "./pages/DesignApprovalTracker";
import InventoryScreen from "./pages/InventoryScreen";
import OccasionCalendar from "./pages/OccasionCalendar";
import ReturnRequestPage from "./pages/ReturnRequestPage";
import LoginScreen from "./pages/LoginScreen";

export default function App() {
  const [view, setView] = useState("enquiry"); // views: 'enquiry', 'workflow', 'dashboard', 'detail', 'login'
  const [selectedEnquiryId, setSelectedEnquiryId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Sync document title and meta description for SEO when view changes
  useEffect(() => {
    let title = "Paper Plane | Bulk Gifting Enquiry Portal";
    let metaDescription = "Submit bulk gifting enquiries for corporate employee kits, custom hampers, and festival branding gifts at Paper Plane.";

    switch (view) {
      case "enquiry":
        title = "Corporate Bulk Gift Intake Form | Paper Plane Gifting";
        metaDescription = "Design and request custom pricing plans for corporate onboarding bundles and festive hampers from Paper Plane.";
        break;
      case "workflow":
        title = "Internal Workflow Tracking & Assistant | Paper Plane";
        metaDescription = "Internal workflow board to review designs, manage branding specifications, and draft quotations.";
        break;
      case "dashboard":
        title = "Corporate Sales Admin Dashboard | Paper Plane Gifting";
        metaDescription = "Overview panel for Paper Plane sales staff to review total leads, prepare quotations, and download CSV reports.";
        break;
      case "personalization":
        title = "Product Personalization | Paper Plane Gifting";
        metaDescription = "Customize individual items and hampers.";
        break;
      case "approval-tracker":
        title = "Design Approval Tracker | Paper Plane Gifting";
        metaDescription = "Client artwork review pipeline.";
        break;
      case "inventory":
        title = "Inventory Management | Paper Plane Gifting";
        metaDescription = "Stock levels and reordering.";
        break;
      case "calendar":
        title = "Occasion Calendar | Paper Plane Gifting";
        metaDescription = "Client corporate events and festivals.";
        break;
      case "returns":
        title = "Return Requests | Paper Plane Gifting";
        metaDescription = "Manage defective or rejected items.";
        break;
      case "detail":
        title = "Enquiry Detail Files Workspace | Paper Plane Gifting";
        metaDescription = "Workspace folder containing client details, workflow timelines, outbound SMTP emails, and pricing tables.";
        break;
      case "login":
        title = "Admin Login | Paper Plane Gifting";
        metaDescription = "Secure login for Paper Plane administrators.";
        break;
      default:
        break;
    }

    document.title = title;

    // Update meta description tag dynamically if it exists
    let metaTag = document.querySelector("meta[name='description']");
    if (!metaTag) {
      metaTag = document.createElement("meta");
      metaTag.setAttribute("name", "description");
      document.head.appendChild(metaTag);
    }
    metaTag.setAttribute("content", metaDescription);
  }, [view]);

  // Navigate to Detail view from other tables/boards
  const handleOpenDetail = (id) => {
    setSelectedEnquiryId(id);
    setView("detail");
  };

  const renderActiveScreen = () => {
    switch (view) {
      case "enquiry":
        return <EnquiryForm />;
      case "login":
        return (
          <LoginScreen 
            onLogin={() => {
              setIsAdmin(true);
              setView("dashboard");
            }} 
          />
        );
      case "workflow":
        return isAdmin ? (
          <WorkflowScreen
            preselectedEnquiryId={selectedEnquiryId}
            onViewDetails={handleOpenDetail}
          />
        ) : <LoginScreen onLogin={() => { setIsAdmin(true); setView("workflow"); }} />;
      case "dashboard":
        return isAdmin ? <SalesDashboard onViewDetails={handleOpenDetail} /> : <LoginScreen onLogin={() => { setIsAdmin(true); setView("dashboard"); }} />;
      case "personalization":
        return <ProductPersonalizationManager isAdmin={isAdmin} />;
      case "approval-tracker":
        return <DesignApprovalTracker isAdmin={isAdmin} />;
      case "inventory":
        return isAdmin ? <InventoryScreen /> : <LoginScreen onLogin={() => { setIsAdmin(true); setView("inventory"); }} />;
      case "calendar":
        return isAdmin ? <OccasionCalendar /> : <LoginScreen onLogin={() => { setIsAdmin(true); setView("calendar"); }} />;
      case "returns":
        return <ReturnRequestPage isAdmin={isAdmin} />;
      case "detail":
        return isAdmin ? (
          <DetailPage
            enquiryId={selectedEnquiryId}
            onBack={() => setView("dashboard")}
          />
        ) : <LoginScreen onLogin={() => { setIsAdmin(true); setView("detail"); }} />;
      default:
        return <EnquiryForm />;
    }
  };

  return (
    <div className="app-container">
      {/* Navigation header bar */}
      <Navbar currentView={view} setView={setView} isAdmin={isAdmin} setIsAdmin={setIsAdmin} />
      
      {/* Main semantic workspace */}
      <main className="main-content">
        {renderActiveScreen()}
      </main>
    </div>
  );
}
