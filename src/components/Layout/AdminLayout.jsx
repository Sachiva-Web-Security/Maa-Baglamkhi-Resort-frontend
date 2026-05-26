import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/* ────────────────────────────────────────────────────────────────────
   urbanPOS-style sidebar definition
   - Top "Admin" header item (highlighted, with power + globe icons)
   - Flat items: Dashboard, Profile, Reports
   - Expandable items: Manage, Front Office, F&B Service, Quick Sales,
     Inventory, Gaming Zone
   Icons are inline SVG so they render the same on all OSes.
   ─────────────────────────────────────────────────────────────────── */

const Icon = {
  user: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" />
    </svg>
  ),
  power: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42A6.96 6.96 0 0 1 19 12a7 7 0 0 1-14 0c0-2.34 1.16-4.4 2.59-5.42L6.17 5.17A8.95 8.95 0 0 0 3 12a9 9 0 0 0 18 0c0-2.74-1.23-5.18-3.17-6.83z" />
    </svg>
  ),
  globe: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm6.93 7h-2.95a15.61 15.61 0 0 0-1.38-3.56A8 8 0 0 1 18.93 9zM12 4.04A13.34 13.34 0 0 1 13.95 9h-3.9A13.34 13.34 0 0 1 12 4.04zM4.26 14a7.94 7.94 0 0 1 0-4h3.38a16.91 16.91 0 0 0 0 4zm.81 2h2.95a15.61 15.61 0 0 0 1.38 3.56A8 8 0 0 1 5.07 16zM8.02 9H5.07a8 8 0 0 1 4.33-3.56A15.61 15.61 0 0 0 8.02 9zm4 10.96A13.34 13.34 0 0 1 10.05 15h3.9A13.34 13.34 0 0 1 12 19.96zM14.34 14H9.66a14.43 14.43 0 0 1 0-4h4.68a14.43 14.43 0 0 1 0 4zm.26 5.56A15.61 15.61 0 0 0 15.98 16h2.95a8 8 0 0 1-4.33 3.56zM16.36 14a16.91 16.91 0 0 0 0-4h3.38a7.94 7.94 0 0 1 0 4z" />
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 5a3 3 0 1 1-3 3 3 3 0 0 1 3-3zm0 13a7 7 0 0 1-5.6-2.8c0-1.9 3.7-3 5.6-3s5.6 1.1 5.6 3A7 7 0 0 1 12 20z" />
    </svg>
  ),
  gear: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4 1A7.8 7.8 0 0 0 15 5.8L14.6 3h-4l-.4 2.8a7.8 7.8 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.8 7.8 0 0 0 2 1.2l.4 2.8h4l.4-2.8a7.8 7.8 0 0 0 2-1.2l2.4 1 2-3.4zM12 15.5a3.5 3.5 0 1 1 3.5-3.5 3.5 3.5 0 0 1-3.5 3.5z" />
    </svg>
  ),
  hotel: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M2 21h20v-2H2zm2-3h2v-2H4zm0-4h2v-2H4zm0-4h2V8H4zm0-4h2V4H4zm4 12h2v-2H8zm0-4h2v-2H8zm0-4h2V8H8zm0-4h2V4H8zm4 12h2v-2h-2zm0-4h2v-2h-2zm0-4h2V8h-2zm0-4h2V4h-2zm4 12h4v-8h-4zm0-10h4V4h-4z" />
    </svg>
  ),
  food: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M8.1 13.34 3.91 9.16A4 4 0 0 1 9.57 3.5l4.18 4.19zM14.83 9.17l1.41-1.41a3 3 0 0 1 4.25 4.24l-1.42 1.42zM3.06 19.94l5.42-5.42 1.41 1.41-5.42 5.42-1.41-.59zM18.36 14a3 3 0 0 1 0 4.24l-1.41 1.42a3 3 0 0 1-4.24 0L9.88 16.83l4.25-4.24z" />
    </svg>
  ),
  grid: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M4 4h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 10h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 16h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4z" />
    </svg>
  ),
  inventory: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 7v4c0 1.7 4 3 9 3s9-1.3 9-3V7c0 1.7-4 3-9 3s-9-1.3-9-3zm0 6v4c0 1.7 4 3 9 3s9-1.3 9-3v-4c0 1.7-4 3-9 3s-9-1.3-9-3z" />
    </svg>
  ),
  gamepad: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M21 6H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h6l1-2h4l1 2h6a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zM7 14H5v-2H3v-2h2V8h2v2h2v2H7zm9-2a1 1 0 1 1 1-1 1 1 0 0 1-1 1zm3 3a1 1 0 1 1 1-1 1 1 0 0 1-1 1z" />
    </svg>
  ),
  report: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm-1 7V3.5L18.5 9zM8 12h8v2H8zm0 4h8v2H8z" />
    </svg>
  ),
  caret: (
    <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
      <path d="M7 10l5 5 5-5z" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V9h14z" />
    </svg>
  ),
  idcard: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM9 8a2 2 0 1 1-2 2 2 2 0 0 1 2-2zm4 10H5v-1.5c0-1.7 2.7-2.5 4-2.5s4 .8 4 2.5zm6-1h-5v-2h5zm0-3h-5v-2h5zm0-3h-5V9h5z" />
    </svg>
  ),
  tax: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M12 2 4 5v6c0 5 3.4 9.6 8 11 4.6-1.4 8-6 8-11V5zm-1 13-4-4 1.4-1.4L11 12.2l4.6-4.6L17 9z" />
    </svg>
  ),
  taxgear: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M12 8a4 4 0 1 0 4 4 4 4 0 0 0-4-4zm9 4a8.9 8.9 0 0 0-.15-1.61l1.95-1.51-2-3.46-2.3.92a8.94 8.94 0 0 0-2.79-1.61L15.3 2h-4l-.41 2.73a8.94 8.94 0 0 0-2.79 1.61l-2.3-.92-2 3.46 1.95 1.51A8.9 8.9 0 0 0 5.5 12a8.9 8.9 0 0 0 .15 1.61L3.7 15.12l2 3.46 2.3-.92a8.94 8.94 0 0 0 2.79 1.61L11.2 22h4l.41-2.73a8.94 8.94 0 0 0 2.79-1.61l2.3.92 2-3.46-1.95-1.51A8.9 8.9 0 0 0 21 12z" />
    </svg>
  ),
  personSm: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4z" />
    </svg>
  ),
  card: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4H4V6h16zm0 10H4v-6h16z" />
    </svg>
  ),
  guests: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5c0-2.3-4.7-3.5-7-3.5zm8 0c-.3 0-.6 0-.9.1 1.2.9 1.9 2 1.9 3.4V19h6v-2.5c0-2.3-4.7-3.5-7-3.5z" />
    </svg>
  ),
  badge: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M20 6h-4V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zM10 4h4v2h-4zm2 6a2 2 0 1 1-2 2 2 2 0 0 1 2-2zm4 8H8v-1c0-1.3 2.7-2 4-2s4 .7 4 2z" />
    </svg>
  ),
  monitor: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M21 2H3a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h7v2H7v2h10v-2h-3v-2h7a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1zm-1 14H4V4h16z" />
    </svg>
  ),
  printer: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M19 8H5a3 3 0 0 0-3 3v6h4v4h12v-4h4v-6a3 3 0 0 0-3-3zM8 19h8v-5H8zm11-8a1 1 0 1 1 1-1 1 1 0 0 1-1 1zM18 3H6v4h12z" />
    </svg>
  ),
  branch: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M12 3 2 12h3v8h6v-6h2v6h6v-8h3z" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5z" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M12 2 4 5v6c0 5 3.4 9.6 8 11 4.6-1.4 8-6 8-11V5zm0 11h7c-.5 4-3.4 6.8-7 7.9z" />
    </svg>
  ),
  prepaid: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M22 6H2v12h20zm-2 10H4V8h16zm-3-4a4 4 0 0 1-3 3.9V14a2 2 0 0 0 0-4v-1.9A4 4 0 0 1 17 12z" />
    </svg>
  ),
  coupon: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M22 10V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4a2 2 0 0 1 0 4v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 1 0-4zM13 17h-2v-2h2zm0-4h-2v-2h2zm0-4h-2V7h2z" />
    </svg>
  ),
  bed: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M7 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm14-5h-9v8H4V6H2v15h2v-3h16v3h2V11a3 3 0 0 0-1-3z" />
    </svg>
  ),
  wave: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M12 2a7 7 0 0 0-7 7v3H3v9h18v-9h-2V9a7 7 0 0 0-7-7zm5 7v3H7V9a5 5 0 0 1 10 0z" />
    </svg>
  ),
  building: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M12 7V3H2v18h20V7zM6 19H4v-2h2zm0-4H4v-2h2zm0-4H4V9h2zm0-4H4V5h2zm4 12H8v-2h2zm0-4H8v-2h2zm0-4H8V9h2zm0-4H8V5h2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8z" />
    </svg>
  ),
  rupee: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M16 5h-4.4c1.1.5 2 1.4 2.3 3H16v2h-2.1c-.4 2.9-2.7 5-5.9 5h-.2l6.3 7h-2.7l-6.6-7.3V13h2.2c2.5 0 3.9-1.2 4.3-3H5V8h6.5c-.5-1.8-2-3-4.2-3H5V3h11z" />
    </svg>
  ),
  cross: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z" />
    </svg>
  ),
  package: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M21 8.5 12 3 3 8.5V16l9 5 9-5zM12 5.2 18.2 9 12 12.8 5.8 9zM5 10.8l6 3.6V19l-6-3.4zm14 4.8L13 19v-4.6l6-3.6z" />
    </svg>
  ),
  chartIcon: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M3 22h18v-2H3zm2-4h2V8H5zm4 0h2V4H9zm4 0h2v-7h-2zm4 0h2v-3h-2z" />
    </svg>
  ),
  settingsBox: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M3 3h18v18H3zm14 9a5 5 0 1 1-5-5 5 5 0 0 1 5 5zm-5-3a3 3 0 1 0 3 3 3 3 0 0 0-3-3z" />
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8z" />
    </svg>
  ),
};

const menuConfig = [
  { type: 'item', key: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/admin' },
  { type: 'item', key: 'profile', label: 'Profile', icon: 'profile', path: '/profile' },
  {
    type: 'group',
    key: 'manage',
    label: 'Manage',
    icon: 'gear',
    children: [
      { label: 'Financial Year', path: '/manage/financial-year', icon: 'calendar' },
      { label: 'ID Cards', path: '/manage/id-cards', icon: 'idcard' },
      { label: 'Tax Category', path: '/manage/tax-category', icon: 'tax' },
      { label: 'Tax Setting', path: '/manage/tax-setting', icon: 'taxgear' },
      { label: 'Users', path: '/manage/users', icon: 'personSm' },
      { label: 'Payment Modes', path: '/manage/payment-modes', icon: 'card' },
      { label: 'Guests', path: '/manage/guests', icon: 'guests' },
      { label: 'Employees', path: '/manage/employees', icon: 'badge' },
      { label: 'Terminals', path: '/manage/terminals', icon: 'monitor' },
      { label: 'Printer Locations', path: '/manage/printer-locations', icon: 'printer' },
      { label: 'Branches', path: '/manage/branches', icon: 'branch' },
      { label: 'Email Configuration', path: '/manage/mail-configuration', icon: 'mail' },
      { label: 'Manage Access Rules', path: '/manage/access-rules', icon: 'shield' },
      { label: 'Prepaid Cards', path: '/manage/prepaid-cards', icon: 'prepaid' },
      { label: 'Discount Coupons', path: '/manage/discount-coupons', icon: 'coupon' },
    ],
  },
  {
    type: 'group',
    key: 'front_office',
    label: 'Front Office',
    icon: 'hotel',
    children: [
      { label: 'Room Type', path: '/front-office/room-type', icon: 'bed' },
      { label: 'Rooms', path: '/front-office/rooms', icon: 'bed' },
      { label: 'Services', path: '/front-office/services', icon: 'wave' },
      { label: 'Companies', path: '/front-office/companies', icon: 'building' },
      { label: 'Settings', path: '/front-office/settings', icon: 'gear' },
    ],
  },
  {
    type: 'group',
    key: 'fnb',
    label: 'F&B Service',
    icon: 'food',
    children: [
      { label: 'Invoice Groups', path: '/invoice-groups', icon: 'report' },
      { label: 'Price Groups', path: '/price-groups', icon: 'rupee' },
      { label: 'Print Groups', path: '/print-groups', icon: 'printer' },
      { label: 'Item Groups', path: '/item-groups', icon: 'chartIcon' },
      { label: 'Units', path: '/units', icon: 'cross' },
      { label: 'Modifiers', path: '/modifiers', icon: 'cross' },
      { label: 'Items', path: '/items', icon: 'report' },
      { label: 'Table Groups', path: '/table-groups', icon: 'grid' },
      { label: 'Tables', path: '/fnb/tables', icon: 'grid' },
      { label: 'Parcel Setting', path: '/parcel-setting', icon: 'package' },
      { label: 'Captains', path: '/fnb/captains', icon: 'folder' },
      { label: 'Invoices', path: '/fnb/invoices', icon: 'folder' },
      { label: 'Edit Invoice', path: '/edit-invoice', icon: 'report' },
      { label: 'Bar to Food', path: '/bar-to-food', icon: 'chartIcon' },
      { label: 'Room Service Settings', path: '/room-service', icon: 'settingsBox' },
      { label: 'Manage Data', path: '/manage-data', icon: 'settingsBox' },
      { label: 'Restaurant Settings', path: '/restaurant-settings', icon: 'settingsBox' },
      { label: 'Owner SMS Settings', path: '/fnb/owner-sms-settings', icon: 'settingsBox' },
    ],
  },
  {
    type: 'group',
    key: 'quick_sales',
    label: 'Quick Sales',
    icon: 'grid',
    children: [
      { label: 'Invoice Groups', path: '/invoice-groups', icon: 'report' },
      { label: 'Price Groups', path: '/price-groups', icon: 'rupee' },
      { label: 'Print Groups', path: '/print-groups', icon: 'printer' },
      { label: 'Item Groups', path: '/item-groups', icon: 'chartIcon' },
      { label: 'Units', path: '/units', icon: 'cross' },
      { label: 'Modifiers', path: '/modifiers', icon: 'cross' },
      { label: 'Items', path: '/items', icon: 'report' },
      { label: 'Parcel Setting', path: '/parcel-setting', icon: 'package' },
      { label: 'Setting', path: '/quick-sales-settings', icon: 'settingsBox' },
      { label: 'Manage Data', path: '/manage-data', icon: 'settingsBox' },
    ],
  },
  {
    type: 'group',
    key: 'inventory',
    label: 'Inventory',
    icon: 'inventory',
    children: [
      { label: 'Vendors', path: '/inventory/vendors', icon: 'folder' },
      { label: 'Item/Raw Material Groups', path: '/inventory/raw-material-groups', icon: 'grid' },
      { label: 'Ingredients', path: '/inventory/ingredients', icon: 'chartIcon' },
      { label: 'Opening Stock Entry', path: '/inventory/opening-stock', icon: 'report' },
      { label: 'Stock Transfer', path: '/inventory/stock-transfer', icon: 'package' },
      { label: 'Purchase Entry', path: '/inventory/purchase-entry', icon: 'rupee' },
      { label: 'Purchase Requisition', path: '/inventory/purchase-requisition', icon: 'report' },
      { label: 'Stock Adjustment', path: '/inventory/stock-adjustment', icon: 'settingsBox' },
    ],
  },
  {
    type: 'group',
    key: 'gaming',
    label: 'Gaming Zone',
    icon: 'gamepad',
    children: [{ label: 'Coming Soon', path: '/admin' }],
  },
  { type: 'item', key: 'reports', label: 'Reports', icon: 'report', path: '/reports' },
];

const AdminLayout = ({ children, setIsAuthenticated }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const navigate = useNavigate();
  const location = useLocation();

  const userName = localStorage.getItem('userName') || 'Admin';

  const isActive = (path) => location.pathname === path;
  const groupHasActive = (group) =>
    group.children?.some((child) => isActive(child.path));

  const toggleGroup = (key) => {
    if (collapsed) {
      setCollapsed(false);
      setOpenGroups((prev) => ({ ...prev, [key]: true }));
      return;
    }
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
    localStorage.removeItem('permissions');
    setIsAuthenticated && setIsAuthenticated(false);
    navigate('/login');
  };

  const sidebarWidth = collapsed ? 56 : 220;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa' }}>
      <aside
        style={{
          width: sidebarWidth,
          background: '#1f1f1f',
          color: '#e6e6e6',
          transition: 'width 0.2s ease',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Brand */}
        <div
          onClick={() => navigate('/dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: collapsed ? '14px 0' : '14px 16px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: '#101010',
            cursor: 'pointer',
            borderBottom: '1px solid #2a2a2a',
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: '#fff',
              color: '#1f1f1f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            Q
          </div>
          {!collapsed && (
            <span style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>
              urbanPOS
            </span>
          )}
        </div>

        {/* Admin header row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            padding: collapsed ? '10px 0' : '10px 14px',
            background: '#2c2c2c',
            borderBottom: '1px solid #2a2a2a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
            <span style={{ color: '#e6e6e6' }}>{Icon.user}</span>
            {!collapsed && (
              <span style={{ fontSize: 13, fontWeight: 600 }}>{userName}</span>
            )}
          </div>
          {!collapsed && (
            <div style={{ display: 'flex', gap: 12 }}>
              <span
                title="Logout"
                onClick={handleLogout}
                style={{ cursor: 'pointer', color: '#bbb' }}
              >
                {Icon.power}
              </span>
              <span
                title="Toggle sidebar"
                onClick={() => setCollapsed(true)}
                style={{ cursor: 'pointer', color: '#bbb' }}
              >
                {Icon.globe}
              </span>
            </div>
          )}
        </div>

        {/* Menu */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {menuConfig.map((node) => {
            if (node.type === 'item') {
              const active = isActive(node.path);
              return (
                <MenuRow
                  key={node.key}
                  collapsed={collapsed}
                  active={active}
                  icon={Icon[node.icon]}
                  label={node.label}
                  onClick={() => navigate(node.path)}
                />
              );
            }

            const open = !!openGroups[node.key];
            const hasActive = groupHasActive(node);
            return (
              <div key={node.key}>
                <MenuRow
                  collapsed={collapsed}
                  active={hasActive}
                  icon={Icon[node.icon]}
                  label={node.label}
                  trailing={
                    !collapsed ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          transition: 'transform 0.15s ease',
                          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                          color: '#999',
                        }}
                      >
                        {Icon.caret}
                      </span>
                    ) : null
                  }
                  onClick={() => toggleGroup(node.key)}
                />
                {!collapsed && open && (
                  <div style={{ background: '#171717', padding: '4px 0' }}>
                    {node.children.map((child) => {
                      const childActive = isActive(child.path);
                      return (
                        <div
                          key={child.path}
                          onClick={() => navigate(child.path)}
                          style={{
                            padding: '8px 16px 8px 38px',
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            color: childActive ? '#fff' : '#bbb',
                            background: childActive ? '#2e6da4' : 'transparent',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) => {
                            if (!childActive) {
                              e.currentTarget.style.background = '#262626';
                              e.currentTarget.style.color = '#fff';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!childActive) {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = '#bbb';
                            }
                          }}
                        >
                          {child.icon && Icon[child.icon] && (
                            <span style={{ display: 'inline-flex', opacity: 0.85 }}>
                              {Icon[child.icon]}
                            </span>
                          )}
                          <span>{child.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Collapse handle (visible when collapsed) */}
        {collapsed && (
          <div
            onClick={() => setCollapsed(false)}
            style={{
              padding: 10,
              textAlign: 'center',
              cursor: 'pointer',
              borderTop: '1px solid #2a2a2a',
              color: '#bbb',
              fontSize: 14,
            }}
            title="Expand"
          >
            ›
          </div>
        )}
      </aside>

      <main
        style={{
          marginLeft: sidebarWidth,
          flex: 1,
          minHeight: '100vh',
          transition: 'margin-left 0.2s ease',
        }}
      >
        {children}
      </main>
    </div>
  );
};

const MenuRow = ({ collapsed, active, icon, label, trailing, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: collapsed ? '11px 0' : '10px 14px',
      cursor: 'pointer',
      color: active ? '#fff' : '#dcdcdc',
      background: active ? 'rgba(46, 109, 164, 0.25)' : 'transparent',
      borderLeft: active ? '3px solid #4a90e2' : '3px solid transparent',
      transition: 'background 0.12s ease, color 0.12s ease',
    }}
    onMouseEnter={(e) => {
      if (!active) {
        e.currentTarget.style.background = '#2a2a2a';
        e.currentTarget.style.color = '#fff';
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = '#dcdcdc';
      }
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        justifyContent: collapsed ? 'center' : 'flex-start',
        width: collapsed ? '100%' : 'auto',
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      <span style={{ display: 'inline-flex' }}>{icon}</span>
      {!collapsed && <span>{label}</span>}
    </div>
    {!collapsed && trailing}
  </div>
);

export default AdminLayout;
