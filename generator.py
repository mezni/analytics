def generate_file_name():
    """
    generate file name
    """
    prefix = "ffff"
    name = "2019"
    suffix = ".csv"
    file_name = prefix + name + suffix
    return file_name


print(generate_file_name())
