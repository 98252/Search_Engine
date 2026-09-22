import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.session import init_db

@pytest.mark.asyncio
async def test_create_and_get_document():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create Document
        payload = {
            "title": "Introduction to Vector Databases",
            "content": "Vector databases store embeddings and enable approximate nearest neighbor search.",
            "url": "https://example.com/vector-db-intro",
            "source": "manual",
            "author": "Dr. Sarah Connor",
            "status": "pending"
        }
        res = await client.post("/api/v1/documents", json=payload)
        assert res.status_code == 201
        data = res.json()
        doc_id = data["id"]
        assert data["title"] == payload["title"]
        assert data["author"] == "Dr. Sarah Connor"
        assert data["status"] == "pending"

        # 2. Get Document by ID
        get_res = await client.get(f"/api/v1/documents/{doc_id}")
        assert get_res.status_code == 200
        get_data = get_res.json()
        assert get_data["id"] == doc_id
        assert get_data["url"] == payload["url"]

        # 3. Update Document
        update_payload = {
            "title": "Updated: Introduction to Vector Databases",
            "status": "indexed"
        }
        put_res = await client.put(f"/api/v1/documents/{doc_id}", json=update_payload)
        assert put_res.status_code == 200
        put_data = put_res.json()
        assert put_data["title"] == "Updated: Introduction to Vector Databases"
        assert put_data["status"] == "indexed"

        # 4. List Documents
        list_res = await client.get("/api/v1/documents?query=Vector&page=1&page_size=10")
        assert list_res.status_code == 200
        list_data = list_res.json()
        assert list_data["total"] >= 1
        assert any(d["id"] == doc_id for d in list_data["items"])

        # 5. Delete Document
        del_res = await client.delete(f"/api/v1/documents/{doc_id}")
        assert del_res.status_code == 200

        # 6. Verify 404 after deletion
        verify_res = await client.get(f"/api/v1/documents/{doc_id}")
        assert verify_res.status_code == 404

@pytest.mark.asyncio
async def test_document_validation_and_errors():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Missing required 'content' field -> 422
        bad_payload = {
            "title": "Document Without Content"
        }
        res = await client.post("/api/v1/documents", json=bad_payload)
        assert res.status_code == 422

        # 2. Empty title -> 422
        empty_title_payload = {
            "title": "",
            "content": "Some valid content"
        }
        res2 = await client.post("/api/v1/documents", json=empty_title_payload)
        assert res2.status_code == 422

        # 3. GET non-existent document -> 404
        res3 = await client.get("/api/v1/documents/00000000-0000-0000-0000-000000000000")
        assert res3.status_code == 404

        # 4. PUT non-existent document -> 404
        res4 = await client.put("/api/v1/documents/00000000-0000-0000-0000-000000000000", json={"title": "New"})
        assert res4.status_code == 404

        # 5. DELETE non-existent document -> 404
        res5 = await client.delete("/api/v1/documents/00000000-0000-0000-0000-000000000000")
        assert res5.status_code == 404

@pytest.mark.asyncio
async def test_webpage_and_bookmark_endpoints():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Webpage create
        web_payload = {
            "url": "https://fastapi.tiangolo.com",
            "domain": "fastapi.tiangolo.com",
            "title": "FastAPI Framework",
            "content": "High performance, easy to learn, fast to code, ready for production",
            "description": "FastAPI framework, high performance, easy to learn"
        }
        wp_res = await client.post("/api/v1/webpages", json=web_payload)
        assert wp_res.status_code == 201
        wp_data = wp_res.json()
        assert wp_data["domain"] == "fastapi.tiangolo.com"
        assert wp_data["status"] == "crawled"

        # Webpage list
        wp_list = await client.get("/api/v1/webpages?query=FastAPI")
        assert wp_list.status_code == 200
        wp_list_data = wp_list.json()
        assert wp_list_data["total"] >= 1

        # Webpage get by ID
        wp_get = await client.get(f"/api/v1/webpages/{wp_data['id']}")
        assert wp_get.status_code == 200
        assert wp_get.json()["url"] == "https://fastapi.tiangolo.com"

