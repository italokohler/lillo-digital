package com.lillo.acougue.tv.data

import android.content.Context
import com.lillo.acougue.tv.data.model.CatalogConfig
import java.net.HttpURLConnection
import java.net.URL
import kotlinx.serialization.json.Json
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class CatalogRepository(
    private val context: Context,
) {
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        coerceInputValues = true
    }

    fun loadCatalog(): CatalogConfig {
        return runCatching {
            context.assets.open("catalog.json").bufferedReader().use { reader ->
                json.decodeFromString(CatalogConfig.serializer(), reader.readText())
            }
        }.getOrElse {
            DefaultCatalog.catalog()
        }
    }

    suspend fun loadRemoteCatalog(url: String): CatalogConfig? = withContext(Dispatchers.IO) {
        var connection: HttpURLConnection? = null
        try {
            connection = (URL(url).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 3000
                readTimeout = 3000
                useCaches = false
                setRequestProperty("Accept", "application/json")
            }

            if (connection.responseCode !in 200..299) {
                return@withContext null
            }

            connection.inputStream.bufferedReader().use { reader ->
                json.decodeFromString(CatalogConfig.serializer(), reader.readText())
            }
        } catch (_: Exception) {
            null
        } finally {
            connection?.disconnect()
        }
    }
}
