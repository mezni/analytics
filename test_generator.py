from generator import generate_file_name


def setup_function(function):
    print(f" Running Setup: {function.__name__}")
    function.x = 10


def teardown_function(function):
    print(f" Running Teardown: {function.__name__}")
    del function.x


def test_generate_file_name():
    assert generate_file_name() == "ffff2019.csv"
