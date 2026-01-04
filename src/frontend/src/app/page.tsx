import Link from 'next/link'
import { Trash2, Shield, Heart, Wrench, FileText, CheckCircle, Clock } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6">
            Selamat Datang di JagaWarga
          </h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Platform pelaporan masalah kota untuk membangun transparansi dan
            akuntabilitas pemerintah daerah
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/submit"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition inline-flex items-center space-x-2"
            >
              <FileText className="w-5 h-5" />
              <span>Buat Laporan</span>
            </Link>
            <Link
              href="/reports"
              className="bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-800 transition border border-white inline-flex items-center space-x-2"
            >
              <FileText className="w-5 h-5" />
              <span>Lihat Laporan Publik</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Kategori Laporan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition">
              <div className="flex justify-center mb-4 text-blue-600">
                <Trash2 className="w-12 h-12" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Sampah</h3>
              <p className="text-gray-600">Laporkan masalah pengelolaan sampah</p>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition">
              <div className="flex justify-center mb-4 text-blue-600">
                <Shield className="w-12 h-12" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Keamanan</h3>
              <p className="text-gray-600">Laporkan masalah keamanan lingkungan</p>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition">
              <div className="flex justify-center mb-4 text-blue-600">
                <Heart className="w-12 h-12" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Kesehatan</h3>
              <p className="text-gray-600">Laporkan masalah kesehatan publik</p>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition">
              <div className="flex justify-center mb-4 text-blue-600">
                <Wrench className="w-12 h-12" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Infrastruktur</h3>
              <p className="text-gray-600">Laporkan kerusakan infrastruktur</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Cara Kerja</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Buat Laporan</h3>
              <p className="text-gray-600">
                Laporkan masalah dengan kategori dan tingkat privasi yang sesuai
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Petugas Menangani</h3>
              <p className="text-gray-600">
                Laporan akan diteruskan ke departemen yang bertanggung jawab
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Masalah Terselesaikan</h3>
              <p className="text-gray-600">
                Pantau status laporan hingga masalah terselesaikan
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}