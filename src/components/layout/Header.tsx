'use client';

import { APP_TITLE } from '@/lib/constants';
import MonthPicker from '../shared/MonthPicker';

interface HeaderProps {
  month: number;
  year: number;
  onChangeMonth: (month: number, year: number) => void;
}

export default function Header({ month, year, onChangeMonth }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
      <h1 className="text-xl font-bold text-gray-900">{APP_TITLE}</h1>
      <MonthPicker month={month} year={year} onChange={onChangeMonth} />
    </header>
  );
}
