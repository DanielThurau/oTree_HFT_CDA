# =======================================
# utility.py
# 
# module for utility and misc functions.
# =======================================

import time
import numpy as np
import datetime
import pytz

DEFAULT_TIMEZONE = pytz.timezone('US/Pacific')


# returns a numpy array representing each
# consecutive byte in an num_of_bytes long integer
# ==============================================
# Note: If data type of integer has less bytes
#       than num_of_bytes, the spliced array will 
#       be padded with 0's at the higher order
def Integer_To_Unit8(integer, num_of_bytes=4):
    spliced = np.zeros(num_of_bytes, dtype=np.uint8)
    for i in range(0,num_of_bytes):
        spliced[i] = np.uint8(np.bitwise_xor(spliced[i],integer))
        integer = integer >> 8

    return np.flip(spliced, 0)
    
def String_To_Unit8(string, num_of_bytes=4):
    spliced = np.zeros(num_of_bytes, dtype=np.uint8)
    for i in range(0,num_of_bytes):
        try:
            spliced[i] = np.uint8(ord(string[i]))
        except IndexError:
            spliced[i] = np.uint8(ord("0"))
    return spliced
    # return np.flip(spliced,0)

# take a souce array and splice it into destination array
# at index=start.
def Splice_Into_Array(destination, source, start, offset):
    for i in range(start, start+offset):
        try:
            destination[i] = source[(i - start)]
        except IndexError:
            destination[i] = np.uint8(ord("0"))

def Byte_Array_To_Int(source, start, offset= 4):
    new_byte_array = np.empty(offset, dtype=np.uint8)
    new_arr_index = 0

    for source_index in range(start, (start + offset)):
        new_byte_array[new_arr_index] = source[source_index]
        new_arr_index += 1

    return int.from_bytes(new_byte_array, byteorder='big', signed=False)

def Byte_Array_To_String(source, start, offset= 4):
    new_string = ""

    for source_index in range(start, (start + offset)):
        new_string = new_string + chr(source[source_index])

    return new_string


def nanoseconds_since_midnight(tz=DEFAULT_TIMEZONE):
    now = datetime.datetime.now(tz=tz)
    timestamp = 0  # since midnight
    timestamp += now.hour
    timestamp *= 60  # hours -> minutes
    timestamp += now.minute
    timestamp *= 60  # minutes -> seconds
    timestamp += now.second
    timestamp *= 10**6  # seconds -> microsecnds
    timestamp += now.microsecond
    timestamp *= 10**3  # microseconds -> nanoseconds
    return timestamp