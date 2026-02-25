import { useState } from "react";
import HotelSettings from "../components/settings/HotelSettings";
import BackupData from "../components/settings/BackupData";
import Notifications from "../components/settings/Notifications";
import PaymentSettings from "../components/settings/paymentSetting";
import PricingTaxes from "../components/settings/PricingTaxes";
import RoomManagement from "../components/settings/RoomManagement";
import Security from "../components/settings/Security";
import SettingsSidebar from "../components/settings/SettingsSidebar";
import UsersRoles from "../components/settings/UsersRoles";

const Setting = () => {
  const [active, setActive] = useState("hotel");

  const titles = {
    hotel: "Hotel / Property Settings",
    room: "Room Management",
    users: "User & Roles",
    pricing: "Pricing & Taxes",
    payment: "Payment Settings",
    notifications: "Notifications",
    security: "Security",
    backup: "Backup & Data",
  };

  const renderContent = () => {
    switch (active) {
      case "hotel":
        return <HotelSettings />;
      case "room":
        return <RoomManagement />;
      case "users":
        return <UsersRoles />;
      case "pricing":
        return <PricingTaxes />;
      case "payment":
        return <PaymentSettings />;
      case "notifications":
        return <Notifications />;
      case "security":
        return <Security />;
      case "backup":
        return <BackupData />;
      default:
        return <p className="p-6">Select an option from the sidebar.</p>;
    }
  };

  return (
    <div className="flex w-full min-h-[calc(100vh-70px)] pt-0 bg-gradient-to-br from-[#071226] via-[#081827] to-[#041019] text-gray-100">
      <SettingsSidebar active={active} setActive={setActive} />
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white">{titles[active] || "Settings"}</h1>
            <p className="text-sm text-gray-300 mt-2">Manage your hotel settings and integrations</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { id: 'hotel', label: '🏨 Hotel' },
                { id: 'backup', label: '🗄️ Backup' },
                { id: 'notifications', label: '🔔 Notifications' },
                { id: 'payment', label: '💳 Payments' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setActive(item.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    active === item.id ? 'bg-gradient-to-r from-[#60a5fa] to-[#10b981] text-black shadow-md' : 'bg-transparent text-gray-300 border border-white/5 hover:border-white/10'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Setting;
