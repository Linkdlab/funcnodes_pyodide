def test_worker_get_info_includes_sorted_packages():
    from funcnodes_pyodide.worker import PyodideWorker

    worker = PyodideWorker()
    info = worker.get_info()

    assert isinstance(info, dict)
    assert "name" in info
    assert "uuid" in info
    assert "packages" in info

    packages = info["packages"]
    assert isinstance(packages, list)
    assert packages == sorted(packages, key=lambda p: p["name"])
    assert all(isinstance(p, dict) and "name" in p and "version" in p for p in packages)
