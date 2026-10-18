import { Link } from 'react-router';
import { ArrowUpRight, Send } from 'lucide-react';

import { TELEGRAM_CHAT_URL } from '@shared/config/contacts';
import { cn } from '@shared/lib/cn';
import { Logo } from '@shared/ui/Logo';

import { FOOTER_BOTTOM_LINKS, FOOTER_COLUMNS } from './lib/footerLinks';

interface FooterProps {
  className?: string;
}

const UNIVERSITY_URL = 'https://stankin.ru';

/**
 * Подвал: знак кафедры с коротким описанием и чатом, три колонки ссылок
 * по разделам и нижняя строка с годом. Год считается от текущей даты —
 * устаревший год в подвале выглядит как заброшенный сайт.
 */
export default function Footer({ className }: FooterProps) {
  return (
    <footer className={cn('u-foot', className)}>
      <div className="u-wrap u-foot-grid">
        <div className="u-foot-brand">
          <Logo />
          <p className="u-foot-about">
            Кафедра управления и информатики в технических системах МГТУ «СТАНКИН»
          </p>
          <div className="u-foot-actions">
            <a className="u-btn-ghost" href={TELEGRAM_CHAT_URL} target="_blank" rel="noreferrer">
              <Send size={16} aria-hidden />
              Чат кафедры
            </a>
            <a className="u-btn-ghost" href={UNIVERSITY_URL} target="_blank" rel="noreferrer">
              Сайт университета
              <ArrowUpRight size={16} aria-hidden />
            </a>
          </div>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <nav key={column.title} className="u-foot-col" aria-label={column.title}>
            <h2>{column.title}</h2>
            <ul>
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link className="u-foot-link" to={link.to}>
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="u-wrap u-foot-bottom">
        <span className="u-copy">© МГТУ «СТАНКИН», {new Date().getFullYear()}</span>
        <ul>
          {FOOTER_BOTTOM_LINKS.map((link) => (
            <li key={link.to}>
              <Link className="u-foot-link" to={link.to}>
                {link.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
