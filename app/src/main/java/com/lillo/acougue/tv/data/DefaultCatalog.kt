package com.lillo.acougue.tv.data

import com.lillo.acougue.tv.data.model.CatalogConfig
import com.lillo.acougue.tv.data.model.Category
import com.lillo.acougue.tv.data.model.Product
import com.lillo.acougue.tv.data.model.ThemeMode

object DefaultCatalog {
    fun catalog(): CatalogConfig {
        return CatalogConfig(
            storeName = "ACOUGUE LILLO",
            subtitle = "Painel digital de carnes e ofertas",
            logoText = "L",
            theme = ThemeMode.DARK,
            slideIntervalSeconds = 12,
            tickerIntervalSeconds = 6,
            qrPayload = "https://lillo.local/promocoes",
            remoteCatalogUrl = "http://10.0.2.2:8787/api/catalog",
            ambientMusicEnabled = false,
            categories = listOf(
                Category(
                    id = "bovinos_1",
                    name = "Bovinos 1",
                    accentColor = "#D64040",
                    banner = "CORTES BOVINOS",
                    description = "Tabela virtual com cortes nobres e de alta saida.",
                    products = listOf(
                        Product("Vazio", 59.99, "kg", true),
                        Product("Costela Ripa", 42.99, "kg"),
                        Product("Costela C/ Vazio", 47.99, "kg"),
                        Product("Costela Minga", 32.99, "kg"),
                        Product("Chuleta", 46.99, "kg"),
                        Product("Contra Filé", 49.99, "kg"),
                        Product("Alcatra C/ Osso", 56.99, "kg"),
                        Product("Alcatra S/ Osso", 65.99, "kg"),
                        Product("Maminha C/ Osso", 57.99, "kg"),
                        Product("Maminha S/ Osso", 66.99, "kg"),
                        Product("Picanha", 89.99, "kg", true),
                        Product("Filé Mignon", 79.99, "kg"),
                    ),
                ),
                Category(
                    id = "bovinos_2",
                    name = "Bovinos 2",
                    accentColor = "#D64040",
                    banner = "CORTES BOVINOS",
                    description = "Tabela virtual com cortes nobres e de alta saida.",
                    products = listOf(
                        Product("Coxão Mole S/Capa", 59.99, "kg"),
                        Product("Coxão Mole C/Capa", 52.99, "kg"),
                        Product("Patinho C/ Osso", 36.99, "kg"),
                        Product("Bife Patinho", 49.99, "kg"),
                        Product("Bife Coxão Fora", 49.99, "kg"),
                        Product("Tatu", 47.99, "kg"),
                        Product("Osso Buco", 22.99, "kg"),
                        Product("Ponta Peito", 27.99, "kg"),
                        Product("Agulha", 28.99, "kg"),
                        Product("Paleta", 33.99, "kg"),
                        Product("Entrecôte", 72.99, "kg"),
                    ),
                ),
                Category(
                    id = "suinos",
                    name = "Suinos",
                    accentColor = "#E06E5A",
                    banner = "CORTES SUINOS",
                    description = "Tabela de cortes suinos para balcao e churrasqueira.",
                    products = listOf(
                        Product("Costela C/ Pele", 31.99, "kg", true),
                        Product("Costela S/ Pele", 31.99, "kg"),
                        Product("Pernil S/ Pele", 21.99, "kg"),
                        Product("Pernil C/ Pele", 21.99, "kg"),
                        Product("Paleta C/ Pele", 24.99, "kg"),
                        Product("Paleta S/ Pele", 24.99, "kg"),
                        Product("Carré C/ Pele", 24.99, "kg"),
                        Product("Carré S/ Pele", 24.99, "kg"),
                        Product("Bisteca", 24.99, "kg"),
                        Product("Panceta", 31.99, "kg"),
                        Product("Sobre Paleta", 27.99, "kg"),
                        Product("Lombo", 29.99, "kg", true),
                        Product("Filézinho", 27.99, "kg"),
                        Product("Ossinho", 7.89, "kg"),
                    ),
                ),
                Category(
                    id = "aves",
                    name = "Aves",
                    accentColor = "#7FB3D5",
                    banner = "CORTES DE AVES",
                    description = "Cortes de aves para o dia a dia e para o churrasco.",
                    products = listOf(
                        Product("Coxa Sob. Congelada", 12.99, "kg", true),
                        Product("Coxa Sob. Temperada", 18.99, "kg"),
                        Product("Coxinha da Asa", 24.99, "kg"),
                        Product("Tulipa", 33.99, "kg"),
                        Product("Coração", 46.99, "kg"),
                        Product("Sobrecoxa", 16.99, "kg"),
                        Product("Sobrecoxa Desossada", 26.99, "kg"),
                        Product("Peito c/ Osso", 19.99, "kg"),
                        Product("Filé Peito", 27.99, "kg"),
                        Product("Frango", 15.99, "kg"),
                        Product("Galinha", 12.99, "kg"),
                    ),
                ),
            ),
        )
    }
}
