import { Mail, Phone, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Tentang JagaWarga</h3>
            <p className="text-gray-400 text-sm">
              Platform pelaporan masalah kota untuk membangun transparansi dan
              akuntabilitas pemerintah daerah.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Tautan Cepat</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/reports" className="text-gray-400 hover:text-white transition">
                  Laporan Publik
                </a>
              </li>
              <li>
                <a href="/submit" className="text-gray-400 hover:text-white transition">
                  Buat Laporan
                </a>
              </li>
              <li>
                <a href="/login" className="text-gray-400 hover:text-white transition">
                  Login
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Kontak</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>support@jagawarga.id</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>(021) 1234-5678</span>
              </li>
              <li className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>Bandung, Indonesia</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} JagaWarga. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}