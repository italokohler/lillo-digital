package com.lillo.acougue.tv.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class CatalogConfig(
    val storeName: String,
    val subtitle: String,
    val logoText: String = "L",
    val theme: ThemeMode = ThemeMode.DARK,
    val slideIntervalSeconds: Int = 12,
    val tickerIntervalSeconds: Int = 6,
    val qrPayload: String = "",
    val remoteCatalogUrl: String = "",
    val ambientMusicEnabled: Boolean = false,
    val pages: List<CatalogPage> = emptyList(),
    val categories: List<Category> = emptyList(),
)

@Serializable
enum class ThemeMode {
    @SerialName("dark")
    DARK,

    @SerialName("light")
    LIGHT,
}

@Serializable
enum class PageType {
    @SerialName("products")
    PRODUCTS,

    @SerialName("video")
    VIDEO,
}

@Serializable
enum class PageTitleSource {
    @SerialName("auto")
    AUTO,

    @SerialName("manual")
    MANUAL,
}

@Serializable
data class CatalogPage(
    val id: String,
    val name: String,
    val type: PageType = PageType.PRODUCTS,
    val accentColor: String = "#D64040",
    val banner: String = "",
    val description: String = "",
    val products: List<Product> = emptyList(),
    val videoUrl: String = "",
    val titleSource: PageTitleSource = PageTitleSource.MANUAL,
)

@Serializable
data class Category(
    val id: String,
    val name: String,
    val accentColor: String,
    val banner: String,
    val description: String,
    val products: List<Product>,
)

@Serializable
data class Product(
    val name: String,
    val price: Double,
    val unit: String,
    val isPromo: Boolean = false,
    val promoLabel: String? = null,
    val imageLabel: String? = null,
    val note: String? = null,
)

fun CatalogConfig.displayPages(): List<CatalogPage> {
    return if (pages.isNotEmpty()) {
        pages
    } else {
        categories.map { it.toCatalogPage() }
    }
}

fun Category.toCatalogPage(): CatalogPage {
    return CatalogPage(
        id = id,
        name = name,
        type = PageType.PRODUCTS,
        accentColor = accentColor,
        banner = banner,
        description = description,
        products = products,
    )
}

sealed interface CatalogLoadState {
    data object Loading : CatalogLoadState

    data class Success(val catalog: CatalogConfig) : CatalogLoadState

    data class Failure(val message: String) : CatalogLoadState
}
